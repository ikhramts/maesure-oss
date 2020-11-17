import { ITimeService } from "shared/utils/time/ITimeService";
import { PollPopup } from "shared/model/PollPopup";
import { Poll } from "shared/model/Poll";
import { PollResponse } from "shared/model/PollResponse";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import * as moment from 'moment'
import { getLatestPopupTimeBefore, getNthPrecedingPopupMinute, getEarliestAllowedPopupMinute } from "./PopupSchedule";
import { QuestionType } from "shared/model/QuestionType";
import { POPUP_TIMEOUT_MSEC } from "./PopupTimeoutTimer";
import { YesNo } from "shared/model/YesNo";
import { SimpleEmitter } from "shared/utils/events/SimpleEmitter";
import { IPastGapBackfiller } from "./IPastGapBackfiller";
import { minuteOfDay } from "shared/utils/time/timeUtils";
import { SubmissionType } from "shared/model/SubmissionTypes";

export const MAX_POPUP_OCCURRENCES_TO_BACKFILL = 9
export const MAX_PERIOD_TO_BACKFILL_MIN = 2 * 60 + 30

// TODO: what happens if the poll responses are updated in the middle of backfilling?

export const PAST_GAP_BACKFILLER_ORIGINATOR_NAME = 'PastGapBackfiller'

export class PastGapBackfiller implements IPastGapBackfiller {
    constructor(timeService: ITimeService) {
        this._timeService = timeService
    }

    onPopupDue(handler: (popup: PollPopup) => void) {
        this._onPopupDue.addHandler(handler)
    }

    updatePoll(poll: Poll) {
        this._poll = poll
    }

    processCollectedResponse(popup: PollPopup, responses: PollResponse[]) 
    : PollResponse[] | null {
        console.log("PastGapBackfiller.processCollectedResponse(): started")
        if (!this.isPollActive()) {
            console.log("PastGapBackfiller.processCollectedResponse(): poll is not active")
            console.log("PastGapBackfiller.processCollectedResponse(): done")
            return null;
        }

        if (popup.originatorName != PAST_GAP_BACKFILLER_ORIGINATOR_NAME) {
            // Not this class's popup. Just record it and see if we should start backfilling.
            console.log("PastGapBackfiller.processCollectedResponse(): handling different originator")

            for (const response of responses) {
                this.recordResponseBlock(response)
            }
            
            // We don't need to try to prevent the backfiller from 
            // going past latest detailed popup response's toTime
            // at this point in the code because the PopupService will not 
            // allow us to go here. See PopupService.popupCompleted(...).
            this.tryStartBackfilling()
            return responses
        
        } else {
            console.log("PastGapBackfiller.processCollectedResponse(): handling own popup")
            if (responses.length != 1) {
                // PastGapBackfiller can only originate popups that 
                // have a single response. This is an error.
                console.error("Received multiple responses to a PastGapBacfiller popup.")
                return []
            }

            // This is a backfill popup created by this class.
            const responseToSubmit = this.processBackfillPopup(popup, responses[0])

            if (responseToSubmit) {
                return [responseToSubmit]
            } else {
                return null
            }

        }
    }

    responseMissed(popup: PollPopup) {
        this.resetBackfillingState()
    }

    updateTimeLogEntries(timeLogEntries: TimeLogEntry[]) {
        // Convert to PastResponseBlocks and store for future use.
        var newPastResponseBlocks: PastResponseBlock[] = []
        const todayMsec = 
            moment(this._timeService.now()).startOf('day').toDate().getTime()

        // Reset the backfill limit. We'll recalculate it.
        this._doNotBackfillBeforeMinute = 0

        // Process the new version of the time log.
        for (const entry of timeLogEntries) {
            const entryToTime = entry.getToTime()

            if (entryToTime.getTime() <= todayMsec) {
                // Don't care about it; we don't backfill time log gaps
                // before today.
                continue
            }

            if (entry.submissionType == SubmissionType.DETAILED_POPUP) {
                // Must not ask the user to backfill the time log
                // past the toTime of the latest detailed popup response.
                const toMinuteOfDay = minuteOfDay(entry.getToTime())

                if (toMinuteOfDay > this._doNotBackfillBeforeMinute) {
                    this._doNotBackfillBeforeMinute = toMinuteOfDay
                }

                continue
            }

            const responseBlock = new PastResponseBlock({
                timeCollectedMin: minuteOfDay(entry.fromTime),
                timeBlockLengthMin: moment.duration(entry.timeBlockLength).asMinutes(),
                date: moment(entry.fromTime).startOf('day').toDate(),
                timeCollected: moment(entry.fromTime).toDate()
            })

            newPastResponseBlocks.push(responseBlock)
        }

        this._pastResponseBlocks = newPastResponseBlocks
    }

    // ================== Private ===================
    private _timeService: ITimeService
    private _onPopupDue = new SimpleEmitter<PollPopup>()
    private _poll: Poll | null = null

    // Have to be always sorted in descending order of timeCollectedMin.
    private _pastResponseBlocks : PastResponseBlock[] = []

    // Backfill state.
    private _backfillStep : BackfillStep = BackfillStep.NotBackfilling
    private _lastBackfillPopupEmitTime : Date = new Date(0)
    private _lastBackfillResponseText : string | null = null
    private _doNotBackfillBeforeMinute = 0

    private recordResponseBlock(response: PollResponse) {
        const newBlock = new PastResponseBlock({
            timeBlockLengthMin: response.timeBlockLengthMin,
            timeCollectedMin: minuteOfDay(response.timeCollected),
            date: moment(response.timeCollected).startOf('day').toDate(),
            timeCollected: response.timeCollected
        })
        
        this._pastResponseBlocks.push(newBlock)
        this._pastResponseBlocks.sort((first, second) => second.timeCollected.getTime() - first.timeCollected.getTime())
    }

    private tryStartBackfilling() {
        console.log("PastGapBackfiller.tryStartBackfilling(): started")
        if (this.canStartBackfilling()) {
            console.log("PastGapBackfiller.tryStartBackfilling(): can backfill")
            this.startBackfillingIfGapExists()
        }
    }

    private processBackfillPopup(popup: PollPopup, response: PollResponse) 
            : PollResponse | null {
        const latestGap = this.getLatestGap()

        if (latestGap == null) {
            // This is generally an exceptional situation, can occur if the gap 
            // was filled from another source. Let's highlight that in the console.
            const timeText = moment(popup.timeCollected).format()
            console.warn("Expected a gap to backfill at " + timeText + " but found no gap.")
            return null

        } else if (response.timeCollected.getTime() >= latestGap.end.getTime()
                    || response.timeCollected.getTime() < latestGap.start.getTime() ) {

            // This should not happen either.
            const timeText = moment(popup.timeCollected).format()
            const gapStart = moment(latestGap.start).format()
            const gapEnd = moment(latestGap.end).format()

            console.warn("Expected the backfill popup to fill the gap at "
                + "timeCollected = " + timeText + ", but instead found " 
                + "the latest gap between " + gapStart + " and " + gapEnd + ".")
            
            // Try to start filling the new gap.
            this.startBackfillingIfGapExists()
            return null
        }

        // Start processing the response.
        if (popup.questionType == QuestionType.Simple) {
            return this.processWhatUserWasDoingQuestion(response, latestGap)
        
        } else if (popup.questionType == QuestionType.YesNo) {
            return this.processFollowupQuestion(response, latestGap)

        } else {
            // This should not happen.
            throw "Cannot handle question type " + popup.questionType
        }
    }

    private startBackfillingIfGapExists() {
        console.log("PastGapBackfiller.startBackfillingIfGapExists(): started")
        const latestGap = this.getLatestGap()

        if (latestGap == null) {
            console.log("PastGapBackfiller.startBackfillingIfGapExists(): no gap to backfill")
            // We're done. There is no gap to fill.
            this.resetBackfillingState()
            return
        
        } else {
            console.log("PastGapBackfiller.startBackfillingIfGapExists(): have gap; will backfill")
            this._lastBackfillResponseText = null
            this.askUserWhatTheyWereDoingInTimeBlock(latestGap.startBackfillAt)
        }

        console.log("PastGapBackfiller.startBackfillingIfGapExists(): done")
    }

    private askUserWhatTheyWereDoingInTimeBlock(fromTime: Date) {
        this._lastBackfillPopupEmitTime = this._timeService.now()
        this._backfillStep = BackfillStep.AskingWhatWasUserDoing

        const atTimeText = moment(fromTime).format("h:mm A")
        const question = "What were you doing at " + atTimeText + "?"

        const popup = new PollPopup({
            isBackfill: true,
            originatorName: PAST_GAP_BACKFILLER_ORIGINATOR_NAME,
            question: question,
            questionType: QuestionType.Simple,
            timeCollected: fromTime,
            timeBlockLengthMin: this._poll!!.getDesiredFrequencyMin()
        })

        this._onPopupDue.emit(popup)
    }

    private askUserWhetherThisWasAllTheyWereDoing(fromTime: Date, toTime: Date, responseText: string) {
        this._lastBackfillPopupEmitTime = this._timeService.now()
        this._backfillStep = BackfillStep.AskingFollowupQuestion
        this._lastBackfillResponseText = responseText

        const fromText = moment(fromTime).format("h:mm A")
        const toText = moment(toTime).subtract(1, 'minute').format("h:mm A")
        const question = "Were you doing mostly '" + responseText + "' between " + fromText + " and " + toText + "?"

        const popup = new PollPopup({
            isBackfill: true,
            originatorName: PAST_GAP_BACKFILLER_ORIGINATOR_NAME,
            question: question,
            questionType: QuestionType.YesNo,
            timeCollected: fromTime
        })

        this._onPopupDue.emit(popup)
    }

    private processWhatUserWasDoingQuestion(response: PollResponse, latestGap: Gap) : PollResponse | null {
        // Check whether we're done with the gap
        if ((latestGap.endMin - latestGap.startMin) <= this._poll!!.getDesiredFrequencyMin()) {
            // This is a short gap.
            // This response should fill the entire gap.
            const adjustedResponse = new PollResponse(response)
            adjustedResponse.timeCollected = latestGap.start
            adjustedResponse.timeBlockLengthMin = latestGap.endMin - latestGap.startMin
            adjustedResponse.submissionType = SubmissionType.PAST_GAP_BACKFILL

            this.recordResponseBlock(adjustedResponse)
            this.startBackfillingIfGapExists()
            return adjustedResponse
        }

        // Check whether we can ask the followup "is this what you were doing" question.
        // We won't ask it if: the user already answered "No" to the exact same question.
        if (response.responseText == this._lastBackfillResponseText) {
            // Keep asking "What were you doing at <time>?" question.
            const adjustedResponse = new PollResponse(response)
            adjustedResponse.submissionType = SubmissionType.PAST_GAP_BACKFILL

            this.recordResponseBlock(adjustedResponse)

            const desiredFrequencyMin = this._poll!!.getDesiredFrequencyMin()
            const nextTimeCollected = 
                moment(response.timeCollected).add(desiredFrequencyMin, "minutes").toDate()

            if (nextTimeCollected.getTime() > latestGap.end.getTime()) {
                // We're out of bounds on this time block. Move on to the next one.
                this.startBackfillingIfGapExists()
                return adjustedResponse
            
            } else {
                // Keep filling this gap.
                this.askUserWhatTheyWereDoingInTimeBlock(nextTimeCollected)
                return adjustedResponse
            }
        }

        // We can ask "is this what you were doing" question.
        this.askUserWhetherThisWasAllTheyWereDoing(latestGap.start, latestGap.end, response.responseText)
        return null
    }

    private processFollowupQuestion(response: PollResponse, latestGap : Gap) : PollResponse {
        if (response.responseText == YesNo.YES) {
            const actualResponse = new PollResponse(response)
            actualResponse.responseText = this._lastBackfillResponseText!!
            actualResponse.timeCollected = latestGap.start
            actualResponse.timeBlockLengthMin = latestGap.endMin - latestGap.startMin
            actualResponse.submissionType = SubmissionType.PAST_GAP_BACKFILL
            this.recordResponseBlock(actualResponse)

            // Move on to the next gap
            this.startBackfillingIfGapExists()
            return actualResponse
        
        } else if (response.responseText == YesNo.NO) {
            // Save the user's previous answer.
            const desiredFrequency = moment.duration(this._poll!!.desiredFrequency).asMinutes()

            const actualResponse = new PollResponse(response)
            actualResponse.responseText = this._lastBackfillResponseText!!
            actualResponse.timeCollected = latestGap.startBackfillAt,
            actualResponse.timeBlockLengthMin = desiredFrequency
            actualResponse.submissionType = SubmissionType.PAST_GAP_BACKFILL
            this.recordResponseBlock(actualResponse)

            // Move on to filling the lext part of this gap.
            const nextTimeCollectedMin = latestGap.startBackfillAtMin + desiredFrequency

            if (nextTimeCollectedMin >= latestGap.endMin) {
                // We're done with this gap. Move on to the next one.
                this.startBackfillingIfGapExists()
            
            } else {
                // Keep backfilling this gap.
                const nextTimeCollected = moment(this._timeService.now()).startOf('day').add(nextTimeCollectedMin, 'minutes').toDate()
                this.askUserWhatTheyWereDoingInTimeBlock(nextTimeCollected)
            }

            return actualResponse
        } else {
            throw "Cannot handle Yes/No option '" + response.responseText + "'."
        }
    }

    private getLatestGap() : Gap | null {
        // We will do all the math in one minute increments to simplify everything and to 
        // prevent floating point errors.
        const poll = this._poll!! // If we got this far, then _poll != null.
        const pastResponseBlocks = this._pastResponseBlocks
        
        // First, determine the boundaries within which to search.
        const now = this._timeService.now()
        const today = moment(now).startOf('day').toDate()

        const backfillWindowEnd = getLatestPopupTimeBefore(poll, now)
        const backfillWindowEndMin = minuteOfDay(backfillWindowEnd)
        
        const earliestPrecedingPopupMinute = 
            getNthPrecedingPopupMinute(poll, now, MAX_POPUP_OCCURRENCES_TO_BACKFILL)

        const earliestBackfillPopupMin = 
            Math.max(earliestPrecedingPopupMinute, this._doNotBackfillBeforeMinute)

        const backfillWindowStartMin = 
                Math.max(getEarliestAllowedPopupMinute(poll, now), 
                        this._doNotBackfillBeforeMinute)

        // Do a quick check whether there are any responses today at all.
        // If there are none, then the entire day needs to be backfilled.
        if (pastResponseBlocks.length == 0
                || pastResponseBlocks[0].date.getTime() != today.getTime()) {
            return new Gap({
                startMin: backfillWindowStartMin,
                startBackfillAtMin: earliestBackfillPopupMin,
                endMin: backfillWindowEndMin,

                start: moment(today).add(backfillWindowStartMin).toDate(),
                startBackfillAt: moment(today).add(earliestBackfillPopupMin).toDate(),
                end: moment(today).add(backfillWindowEndMin).toDate()
            })
        }
        
        // Find the end of the latest gap.
        // We'll work backwards from the beginning of the current time block.
        let responsesWereProvidedAfter = backfillWindowEndMin
        let gapEndMinute = Number.MAX_SAFE_INTEGER
        let timeBlockIndex = 0

        for (; timeBlockIndex < pastResponseBlocks.length; timeBlockIndex++) {
            const timeBlock = pastResponseBlocks[timeBlockIndex]

            if (timeBlock.date.getTime() < today.getTime()) {
                // We've run out of today's blocks and found the end of the gap.
                gapEndMinute = responsesWereProvidedAfter
                break
            }

            if ((timeBlock.timeCollectedMin + timeBlock.timeBlockLengthMin) >= responsesWereProvidedAfter) {
                // No gap yet. Keep looking.
                responsesWereProvidedAfter = 
                    Math.min(timeBlock.timeCollectedMin, responsesWereProvidedAfter)

                if (responsesWereProvidedAfter <= earliestBackfillPopupMin) {
                    // We're done. There is no gap to fill.
                    return null
                }
            } else {
                // Found a gap.
                gapEndMinute = responsesWereProvidedAfter
                break
            }

            if (responsesWereProvidedAfter == 0) {
                // We've reached the beginning of today. There is no gap to fill.
                return null
            }
        }

        if (gapEndMinute == Number.MAX_SAFE_INTEGER) {
            // We ran out of time blocks with responses before getting to the end 
            // of the window. That means that the last block was the end of the gap.
            gapEndMinute = 
                pastResponseBlocks[pastResponseBlocks.length - 1].timeCollectedMin
        }

        // Find the beginning of the gap.
        // Work backwards from the gap end.
        let gapStartMinute = backfillWindowStartMin

        if (timeBlockIndex < pastResponseBlocks.length) {
            const nextBlockWithResponse = pastResponseBlocks[timeBlockIndex]

            // Have to check whether the next block is still part of today.
            // If it's not, we have to fill the gap from the beginning of the day.
            // Otherwise, the gap starts at the end of the next block.
            if (nextBlockWithResponse.date.getTime() == today.getTime()) {
                gapStartMinute = nextBlockWithResponse.timeCollectedMin 
                                    + nextBlockWithResponse.timeBlockLengthMin
            } 
        }

        // Find the earliest time when a popup can appear.
        const gapStartBackfillAt = Math.max(gapStartMinute, earliestBackfillPopupMin)
        const startMinute = Math.max(gapStartMinute, backfillWindowStartMin)

        // Convert some of the time values into Date objects for future use.
        const start = moment(today).add(startMinute, 'minutes').toDate()
        const startBackfillAt = moment(today).add(gapStartBackfillAt, 'minutes').toDate()
        const end = moment(today).add(gapEndMinute, 'minutes').toDate()

        // Done.
        return new Gap({
            startMin: startMinute,
            startBackfillAtMin: gapStartBackfillAt,
            endMin: gapEndMinute,

            start: start,
            startBackfillAt: startBackfillAt,
            end: end
        })
    }

    private canStartBackfilling() : boolean {
        if (this._backfillStep == BackfillStep.NotBackfilling) {
            return true
        }

        const nowSec = this._timeService.now().getTime() 
        const lastBackfillTimeSec = this._lastBackfillPopupEmitTime.getTime()

        if ((nowSec - lastBackfillTimeSec) > POPUP_TIMEOUT_MSEC) {
            // The user probably missed the last popup.
            return true
        }

        return false
    }

    private isPollActive() : boolean {
        if (!this._poll) {
            return false
        }

        if (!this._poll.wasStarted) {
            return false
        }

        return true
    }

    private resetBackfillingState() {
        this._backfillStep = BackfillStep.NotBackfilling
        this._lastBackfillPopupEmitTime = new Date(0)
        this._lastBackfillResponseText = null
    }

}

enum BackfillStep {
    NotBackfilling, AskingWhatWasUserDoing, AskingFollowupQuestion
}

class PastResponseBlock {
    timeCollectedMin: number = 0
    timeBlockLengthMin: number = 0
    date: Date = new Date(0)
    timeCollected: Date = new Date(0)
    
    constructor(init?: Partial<PastResponseBlock>) {
        if (!init) return

        Object.assign(this, init)
    }
}

class Gap {
    startMin: number = 0
    startBackfillAtMin: number = 0
    endMin: number = 0

    start: Date = new Date(0)
    startBackfillAt = new Date(0)
    end: Date = new Date(0)

    constructor(init?: Partial<Gap>) {
        if (!init) return

        Object.assign(this, init)
    }
}



