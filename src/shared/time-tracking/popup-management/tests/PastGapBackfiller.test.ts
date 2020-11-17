import { MockTimeService } from "shared/utils/time/MockTimeService";
import { Poll } from "shared/model/Poll";
import { PollPopup } from "shared/model/PollPopup";
import { PastGapBackfiller, MAX_POPUP_OCCURRENCES_TO_BACKFILL } from "../PastGapBackfiller";
import * as moment from 'moment'
import { PollResponse } from "shared/model/PollResponse";
import { QuestionType } from "shared/model/QuestionType";
import { YesNo } from "shared/model/YesNo";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import { SubmissionType } from "shared/model/SubmissionTypes";

// Mocks
let timeService: MockTimeService

// Mock data
const TEST_DATE = new Date(2019, 2, 3, 0, 0, 0, 0)
let testPoll: Poll

// Some outputs are captured here
let emittedPopups: PollPopup[]

// The star of the show
let backfiller: PastGapBackfiller

beforeEach(() => {
    testPoll = new Poll({
        desiredFrequency: "0:15:00",
        wasStarted: true,

        // far enough in the past to not matter
        startedAt: moment(TEST_DATE).subtract(3, 'days').toDate() 
    })

    timeService = new MockTimeService()
    timeService.setNow(TEST_DATE)

    emittedPopups = []
    backfiller = new PastGapBackfiller(timeService)
    backfiller.onPopupDue(popup => {emittedPopups.push(popup)})
    backfiller.updatePoll(testPoll)
})


test("When a user submits a response, should show initial backfill for past gap", () => {
    // First, provide a successful response.
    userSubmitsAResponse()

    // Miss a few popups.
    timeAdvancesForward(1, 'hour')

    // Provide another successful response
    const result2 = userSubmitsAResponse()

    // Assert - there should be one popup asking what the user was doing at the missed time.
    expect(emittedPopups).toHaveLength(1)

    const emittedPopup = emittedPopups[0]
    const expectedTime = 
        moment(TEST_DATE).add(testPoll.getDesiredFrequencyMin(), 'minutes').toDate()

    expect(emittedPopup.timeCollected).toStrictEqual(expectedTime)
    expect(emittedPopup.questionType).toBe(QuestionType.Simple)
    expect(emittedPopup.timeBlockLengthMin).toBe(15)
    expect(emittedPopup.question).toContain("12:15 AM")
    
    // Assert - the original popup should be sent on for further submission
    const submittedResponse = result2.submittedResponses!![0]
    expect(submittedResponse).toBe(result2.popupResponse)
})

test("For popups originated by other popup sources, " 
        + "should preserve the submission type of the original submission", () => {
    // First, provide a successful response.
    userSubmitsAResponse()

    // Miss a few popups.
    timeAdvancesForward(1, 'hour')

    // Provide another successful response
    const result2 = userSubmitsAResponse()

    // Assert - the original popup should be sent on for further submission
    const submittedResponse = result2.submittedResponses!![0]
    expect(submittedResponse.submissionType).toBe(SubmissionType.SIMPLE_POPUP)
})

test("If user provides a response to initial backfill popup, "
        + "should ask if this was all they were doing", () => {
    // First, provide a successful response.
    userSubmitsAResponse()

    // Miss a few popups.
    timeAdvancesForward(1, 'hour')

    // Provide another successful response
    userSubmitsAResponse()

    // Provide a response to the first backfill popup
    const result = userSubmitsBackfillResponse("some thing")

    // Assert - emit one popup asking whether the user was doing the 
    // same thing for the whole block.
    expect(emittedPopups).toHaveLength(1)

    const emittedPopup = emittedPopups[0]
    expect(emittedPopup.questionType).toBe(QuestionType.YesNo)

    const expectedTime = 
        moment(TEST_DATE).add(testPoll.getDesiredFrequencyMin(), 'minutes').toDate()
    expect(emittedPopup.question).toContain("12:15 AM")
    expect(emittedPopup.question).toContain("12:59 AM")
    expect(emittedPopup.question).toContain(result.popupResponse.responseText)
    expect(emittedPopup.timeCollected).toStrictEqual(expectedTime)

    // Assert - should not allow any result to be submitted to the server
    expect(result.submittedResponses).toBeNull()
})

test("Initial backfill popup should be as of gap start", () => {
    // First, have a successful response - but with an odd period.
    const popup1 = mockPopup()
    const response1 = mockResponse(popup1)
    response1.timeBlockLengthMin = 17
    backfiller.processCollectedResponse(popup1, [response1])

    // Miss a few popups
    timeAdvancesForward(1, 'hour')

    // Provide a successful response
    const popup2 = mockPopup()
    const response2 = mockResponse(popup2)
    backfiller.processCollectedResponse(popup2, [response2])

    // Assert - there should be one popup asking what the user was doing at the start of the gap
    expect(emittedPopups).toHaveLength(1)

    const emittedPopup = emittedPopups[0]
    const expectedTime = moment(TEST_DATE).add(17, 'minutes').toDate()
    expect(emittedPopup.timeCollected).toStrictEqual(expectedTime)
    expect(emittedPopup.question).toContain("12:17 AM")
})

test("Initial backfill popup should be inside the latest gap", () => {
    // Have a successful response
    userSubmitsAResponse()

    // Miss some popups
    timeAdvancesForward(45, 'minutes')

    // Have another successful response
    userSubmitsAResponse()
    emittedPopups.length = 0

    // Miss more popups and provide another response
    timeAdvancesForward(45, 'minutes')
    userSubmitsAResponse()

    // Assert - there should be one popup asking what we were doing as of the most recent gap
    expect(emittedPopups).toHaveLength(1)

    const expectedTime = moment(TEST_DATE).add(60, 'minutes').toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
    expect(emittedPopups[0].question).toContain(moment(expectedTime).format("h:mm A"))
})

test("If the initial backfill popup covers the entire odd gap, "
        + "then should not ask followup Yes/No question", () => {
    // First, have a successful response, but with an odd period.
    const popup1 = mockPopup()
    const response1 = mockResponse(popup1)
    response1.timeBlockLengthMin = 25
    backfiller.processCollectedResponse(popup1, [response1])

    // Miss some time and add another misaligned time block
    timeAdvancesForward(35, 'minutes')
    userSubmitsAResponse()
    timeAdvancesForward(15, 'minutes')
    emittedPopups.length = 0
    userSubmitsAResponse()

    // Submit the emitted popup
    const backfillPopup = emittedPopups[0]
    emittedPopups.length = 0
    const backfillResponse = mockResponse(backfillPopup, "some response")
    const processedResponses = 
        backfiller.processCollectedResponse(backfillPopup, [backfillResponse])!!

    // Assert - there should not be any more popups.
    expect(emittedPopups).toHaveLength(0)

    // Assert - should sent the submitted response to the back end for processing.
    // But with adjusted time block details.
    const processedResponse = processedResponses[0]
    expect(processedResponse.timeBlockLengthMin).toBe(10)
    expect(processedResponse.responseText).toBe("some response")
    expect(processedResponse.timeCollected).toStrictEqual(backfillPopup.timeCollected)
    expect(processedResponse.submissionType).toBe(SubmissionType.PAST_GAP_BACKFILL)
})

test("If the initial backfill popup covers entire normal gap, " 
            + "then should not ask followup Yes/No question", () => {
    // Provide a successful response
    userSubmitsAResponse()

    // Miss one popup and provide another response.
    timeAdvancesForward(30, 'minutes')
    userSubmitsAResponse()

    // Submit the emitted popup.
    const result = userSubmitsBackfillResponse("some thing")

    // Assert - there should be no followup popups.
    expect(emittedPopups).toHaveLength(0)

    // Assert - should submit the backfill response as is.
    const submittedResponses = result.submittedResponses!!
    const submittedResponse = submittedResponses[0]

    expect(submittedResponse.timeCollected).toStrictEqual(result.popup.timeCollected)
    expect(submittedResponse.timeBlockLengthMin).toBe(15)
    expect(submittedResponse.responseText).toBe("some thing")
})

test("If done backfilling a short gap, should start backfilling the next gap", () => {
    // Provide a successful response
    userSubmitsAResponse()

    // Miss one popup and submit a response.
    timeAdvancesForward(30, 'minutes')
    userSubmitsAResponse()
    emittedPopups.length = 0

    // Make another gap and submit a response.
    timeAdvancesForward(30, 'minutes')
    userSubmitsAResponse()

    // Respond to the backfill popup.
    userSubmitsBackfillResponse("some thing")

    // Assert - should emit a popup for the first gap.
    expect(emittedPopups).toHaveLength(1)
    expect(emittedPopups[0].questionType).toBe(QuestionType.Simple)
    expect(emittedPopups[0].isBackfill).toBe(true)

    const expectedTime = 
        moment(TEST_DATE).add(testPoll.getDesiredFrequencyMin(), 'minutes').toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
})

test("If done backfilling a long gap, should start backfilling the next gap", () => {
    // Provide a successful response
    userSubmitsAResponse()

    // Skip a popup and provide another response
    timeAdvancesForward(30, 'minutes')
    userSubmitsAResponse()
    emittedPopups.length = 0

    // Skip more popups and provide another successful response.
    timeAdvancesForward(45, 'minutes')
    userSubmitsAResponse()
    
    // Respond to the backfill popup and its followup question
    userSubmitsBackfillResponse("some thing")
    userSubmitsBackfillResponse(YesNo.YES)

    // Assert - should emit a backfill popup as of the start of the preceding gap
    expect(emittedPopups).toHaveLength(1)
    expect(emittedPopups[0].questionType).toBe(QuestionType.Simple)
    expect(emittedPopups[0].isBackfill).toBe(true)

    const expectedTime = 
        moment(TEST_DATE).add(testPoll.getDesiredFrequencyMin(), 'minutes').toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
})

test("If backfilling a very large gap, should ask followup question "
        + "from the gap start even if it's past the allwed period", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(7, 'hours')
    userSubmitsAResponse()

    // Respond to the initial backfill popup.
    userSubmitsBackfillResponse("some thing")

    // Assert - should ask "was that all you were doing" starting at the gap start
    expect(emittedPopups[0].question).toContain("12:15 AM")
})

test("If the user answers the followup question with a Yes, should submit a single "
        + "response covering the whole gap", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(7.25, 'hours')
    userSubmitsAResponse()
    
    // Respond to the first backfill popup.
    userSubmitsBackfillResponse("some thing")

    // Respond "Yes" to the follow-up question ("were you doing this the whole time?")
    const result = userSubmitsBackfillResponse(YesNo.YES)

    // Assert - should not show any more backfill popups.
    expect(emittedPopups).toHaveLength(0)

    // Assert - should submit a single response covering the entire gap.
    const submittedResponse = result.submittedResponses!![0]

    const expectedTime = 
        moment(TEST_DATE).add(testPoll.getDesiredFrequencyMin(), 'minutes').toDate()
    expect(submittedResponse.timeCollected).toStrictEqual(expectedTime)
    expect(submittedResponse.timeBlockLengthMin).toBe(7 * 60)
    expect(submittedResponse.responseText).toBe("some thing")
    expect(submittedResponse.submissionType).toBe(SubmissionType.PAST_GAP_BACKFILL)
})


test("If the user answers followup question with a No, should show the next "
        + "initial backfill question", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(1, 'hours')
    userSubmitsAResponse()
    
    // Respond to the first backfill popup.
    const backfillResult1 = userSubmitsBackfillResponse("some thing")

    // Respond "No" to the follow-up question ("were you doing this the whole time?")
    const backfillResult2 = userSubmitsBackfillResponse(YesNo.NO)

    // Assert - should emit a popup for the next time block
    expect(emittedPopups).toHaveLength(1)
    expect(emittedPopups[0].questionType).toBe(QuestionType.Simple)
    const expectedTimeCollected = moment(TEST_DATE)
                                    .add(testPoll.getDesiredFrequencyMin(), 'minutes')
                                    .add(testPoll.getDesiredFrequencyMin(), 'minutes')
                                    .toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTimeCollected)

    // Assert - should submit a single response covering the first missed time block.
    const submittedResponse = backfillResult2.submittedResponses!![0]
    const firstBackfillResponse = backfillResult1.popupResponse

    expect(submittedResponse.responseText).toBe("some thing")
    expect(submittedResponse.timeCollected).toStrictEqual(firstBackfillResponse.timeCollected)
    expect(submittedResponse.timeBlockLengthMin).toBe(firstBackfillResponse.timeBlockLengthMin)
})

test("If the user answers followup question with a No on a very large gap, "
        + "should submit backfill response as of the last popup timeCollected", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(15 * (MAX_POPUP_OCCURRENCES_TO_BACKFILL + 4), 'minutes')
    userSubmitsAResponse()
    
    // Respond to the first backfill popup.
    const backfillResult1 = userSubmitsBackfillResponse("some thing")

    // Respond "No" to the follow-up question ("were you doing this the whole time?")
    const backfillResult2 = userSubmitsBackfillResponse(YesNo.NO)

    // Assert - should emit a popup for the next time block
    expect(emittedPopups).toHaveLength(1)
    expect(emittedPopups[0].questionType).toBe(QuestionType.Simple)
    const expectedTimeCollected = 
        moment(timeService.now())
        .subtract(15 * (MAX_POPUP_OCCURRENCES_TO_BACKFILL - 1), 'minutes' )
        .toDate()

    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTimeCollected)

    // Assert - should submit a single response covering the first missed time block.
    const submittedResponse = backfillResult2.submittedResponses!![0]
    const firstBackfillResponse = backfillResult1.popupResponse

    expect(submittedResponse.timeCollected).toStrictEqual(firstBackfillResponse.timeCollected)
})

test("Should not ask another Yes/No question if the user keeps providing "
        + "the same backfill response", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(1, 'hours')
    userSubmitsAResponse()
    
    // Respond to the first backfill popup.
    userSubmitsBackfillResponse("some thing")

    // Respond "No" to the follow-up question ("were you doing this the whole time?")
    userSubmitsBackfillResponse(YesNo.NO)

    // Respond to the next "what were you doing at ___ time" popup with the same answer.
    const result = userSubmitsBackfillResponse("some thing")

    // Assert - there is another "what were you doing at ___ time" 
    // popup for the next time block.
    expect(emittedPopups).toHaveLength(1)
    const expectedTimeCollected = moment(TEST_DATE).add(15 * 3, 'minutes').toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTimeCollected)
    expect(emittedPopups[0].questionType).toBe(QuestionType.Simple)

    // Assert - should have submitted last backfill response as is,
    // only adjusting the submission type.
    const submittedResponse = result.submittedResponses!![0]
    const popupResponse = result.popupResponse
    expect(submittedResponse.responseText).toBe(popupResponse.responseText)
    expect(submittedResponse.timeBlockLengthMin).toBe(popupResponse.timeBlockLengthMin)
    expect(submittedResponse.timeCollected).toStrictEqual(popupResponse.timeCollected)
    expect(submittedResponse.submissionType).toBe(SubmissionType.PAST_GAP_BACKFILL)
})

test("Should ask another Yes/No question if the user provides a different "
        + "reponse to the next backfill popup", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(1, 'hours')
    userSubmitsAResponse()
    
    // Respond to the first backfill popup.
    userSubmitsBackfillResponse("some thing")

    // Respond "No" to the follow-up question ("were you doing this the whole time?")
    userSubmitsBackfillResponse(YesNo.NO)

    // Provide a new response to the next "what were you doing at ___ time" 
    // popup with the same answer.
    const result = userSubmitsBackfillResponse("different thing")

    // Assert - there is another "were you doing ____ all this time?" popup
    expect(emittedPopups).toHaveLength(1)
    expect(emittedPopups[0].questionType).toBe(QuestionType.YesNo)

    // Assert - there should be no response submitted
    expect(result.submittedResponses).toBe(null)
})

test("If the user misses initial backfill popup question, should not show it again", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(1, 'hours')
    userSubmitsAResponse()

    // Miss the follow-up
    const backfillPopup = emittedPopups[0]
    emittedPopups.length = 0
    backfiller.responseMissed(backfillPopup)

    // Assert - should not show another popup.
    expect(emittedPopups).toHaveLength(0)
})

test("if the user misses followup Yes/No question, should not submit "
        + "any response and should not show any followup popups", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(1, 'hours')
    userSubmitsAResponse()

    // Respond to the first backfill popup.
    userSubmitsBackfillResponse("some thing")

    // Miss the second backfill
    const backfillPopup = emittedPopups[0]
    emittedPopups.length = 0
    backfiller.responseMissed(backfillPopup)

    // Assert - should not show another popup.
    expect(emittedPopups).toHaveLength(0)
})

test("If the user misses the followup Yes/No question and submits "
        + "another response later, should start the backfill process from beginning", () => {
    // Start with a successful response.
    userSubmitsAResponse()

    // Skip a lot of responses.
    timeAdvancesForward(1, 'hours')
    userSubmitsAResponse()

    // Respond to the first backfill popup.
    userSubmitsBackfillResponse("some thing")

    // Miss the second backfill
    const backfillPopup = emittedPopups[0]
    emittedPopups.length = 0
    backfiller.responseMissed(backfillPopup)

    // And the user comes back
    timeAdvancesForward(15, 'minutes')
    userSubmitsAResponse()

    // Assert - should restart backfilling
    expect(emittedPopups).toHaveLength(1)
    
    const expectedTime = 
        moment(TEST_DATE).add(testPoll.getDesiredFrequencyMin(), 'minutes').toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
    expect(emittedPopups[0].questionType).toBe(QuestionType.Simple)
})

test("Should not backfill before the poll's startedAt time", () => {
    // Set up.
    userSubmitsAResponse()

    const updatedPoll = new Poll(testPoll)
    updatedPoll.startedAt = moment(TEST_DATE).add(1, 'hours').toDate()
    backfiller.updatePoll(updatedPoll)

    // Skip some responses.
    timeAdvancesForward(2, 'hours')
    userSubmitsAResponse()

    // Assert - should not go back farther than startedAt time.
    const expectedTime = updatedPoll.startedAt!!
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
})

test("If the time log has a detailed popup response, "
        + "should not back fill past its toTime", () => {
    // First, provide a successful response.
    userSubmitsAResponse()

    // Miss a few popups.
    timeAdvancesForward(1, 'hour')

    // Add a response from a detailed popup.
    const newResponses = [
        new TimeLogEntry({
            fromTime: moment(TEST_DATE).add(45, 'minutes').format("YYYY-MM-DDTHH:mm:ss"),
            timeBlockLength: "0:15:00",
            entryText: "",
            submissionType: SubmissionType.DETAILED_POPUP
        }),
    ]

    backfiller.updateTimeLogEntries(newResponses)
    
    // Provide another successful response
    userSubmitsAResponse()

    // Assert - There should not be a popup despite presence of gaps
    // in the time log.
    expect(emittedPopups).toHaveLength(0)
})

test("Should recalculate last detailed popup response time " +
        + "on each time log update", () => {

    // First, provide a successful response.
    userSubmitsAResponse()

    // Miss a few popups.
    timeAdvancesForward(1, 'hour')

    // Add a response from a detailed popup.
    const newResponses = [
        new TimeLogEntry({
            fromTime: moment(TEST_DATE).add(45, 'minutes').format("YYYY-MM-DDTHH:mm:ss"),
            timeBlockLength: "0:15:00",
            entryText: "",
            submissionType: SubmissionType.DETAILED_POPUP
        }),
    ]

    backfiller.updateTimeLogEntries(newResponses)

    // But than change the history so it doesn't exist any more
    backfiller.updateTimeLogEntries([])

    // Provide another successful response
    userSubmitsAResponse()

    // Assert - There SHOULD be a backfill popup.
    expect(emittedPopups).toHaveLength(1)
})

test("If the time log has a detailed popup response, "
        + "should not ask yes/no questions starting prior to that time", () => {
    // First, provide a successful response.
    userSubmitsAResponse()

    // Miss a few popups.
    timeAdvancesForward(1, 'hour')
    timeAdvancesForward(15, 'minutes')

    // Add a response from a detailed popup.
    const newResponses = [
        new TimeLogEntry({
            fromTime: moment(TEST_DATE).format("YYYY-MM-DDTHH:mm:ss"),
            timeBlockLength: "0:15:00",
            entryText: "",
            submissionType: SubmissionType.SIMPLE_POPUP
        }),
        new TimeLogEntry({
            fromTime: moment(TEST_DATE).add(45, 'minutes').format("YYYY-MM-DDTHH:mm:ss"),
            timeBlockLength: "0:15:00",
            entryText: "",
            submissionType: SubmissionType.DETAILED_POPUP
        }),
    ]

    backfiller.updateTimeLogEntries(newResponses)
    
    // Provide another successful response
    // and the first backfill response
    userSubmitsAResponse()
    expect(emittedPopups).toHaveLength(1)
    userSubmitsBackfillResponse("some thing")

    // Assert - There should not be a "Have you been doing this since XXX" popup
    expect(emittedPopups).toHaveLength(0)
})

test("When showing backfills, do not ask about the latest regular "
        + "collection time if we did not miss the next response time yet", () => {
    // Set up - we've missed 3 responses, we're inside time block #5, 
    // and the user has not provided a response for that block yet.
    userSubmitsAResponse()
    timeAdvancesForward(61, 'minutes')

    // Act - user submits a response for teh preceding time block (12:45 - 1:00).
    const popup2 = mockPopup()
    popup2.timeCollected = moment(TEST_DATE).add(45, 'minutes').toDate()
    const response2 = mockResponse(popup2)
    backfiller.processCollectedResponse(popup2, [response2])

    // Assert - we start showing the backfill for 12:00 and not for 1:00.
    // The backfiller should not touch the 1:00-1:15 block because we 
    // haven't finished missing it yet.
    const expectedTime = moment(TEST_DATE).add(15, 'minutes').toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
})

test("Should not show more than the permitted number of backfill popups at a time", () => {
    // Set up.
    timeAdvancesForward(7, 'hours')

    // Act
    userSubmitsAResponse()

    // Assert - the first backfill popup is not too far in the past.
    const expectedTime = 
        moment(timeService.now())
        .subtract(15 * MAX_POPUP_OCCURRENCES_TO_BACKFILL, 'minutes')
        .toDate()

    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
})

test("Should not continue backfilling if the poll is stopped", () => {
    // Set up - miss some popups
    timeAdvancesForward(1, 'hours')

    // Turn off the poll.
    const updatedPoll = new Poll(testPoll)
    updatedPoll.wasStarted = false
    updatedPoll.startedAt = null
    backfiller.updatePoll(updatedPoll)

    // Act.
    userSubmitsAResponse()

    // Assert - there should not be a popup.
    expect(emittedPopups).toHaveLength(0)
})

test("When the poll responses are updated, should use the new set of "
        + "poll responses to determine the gaps", () => {
    // Set up.
    const newResponses = [
        new TimeLogEntry({
            fromTime: moment(TEST_DATE).format("YYYY-MM-DDTHH:mm:ss"),
            timeBlockLength: "0:15:00",
            entryText: ""
        }),
        new TimeLogEntry({
            fromTime: moment(TEST_DATE).add(30, 'minutes').format("YYYY-MM-DDTHH:mm:ss"),
            timeBlockLength: "0:15:00",
            entryText: ""
        }),
    ]

    // Skip some responses.
    timeAdvancesForward(45, "minutes");

    // Backfill some responses from somewher else.
    backfiller.updateTimeLogEntries(newResponses)

    // Trigger a backfill popup.
    userSubmitsAResponse()

    // Assert - the popup is for the only remaining gap at 12:15-12:30.
    const expectedTimeCollected = moment(TEST_DATE).add(15, 'minutes').toDate()
    expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTimeCollected)
})

describe("When the new day starts", () => {
    test("If a user submits a popup, should offer to backfill "
            + "no earlier than start of day", () => {
        // Start on the first day.
        userSubmitsAResponse()

        // Wait until the next day
        timeService.advance(1, 'days')
        timeService.advance(30, 'minutes')

        // Submit another response and trigger the start of backfill.
        emittedPopups.length = 0
        userSubmitsAResponse()

        // Assert - the backfill popup should be as of 00:00 on the new day.
        const expectedTime = moment(timeService.now()).startOf('day').toDate()
        expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
    })

    test("When the user replies 'Yes' to the 'was this all you were doing' question, "
            + "should submit a gap that starts no earlier than start of day", () => {
        // Start on the first day.
        userSubmitsAResponse()

        // Wait until the next day
        timeService.advance(1, 'days')
        timeService.advance(30, 'minutes')

        // Submit the responses the user submits the final popup.
        userSubmitsAResponse()
        userSubmitsBackfillResponse("Some thing")
        const result = userSubmitsBackfillResponse(YesNo.YES)

        // Assert - the final response submitted to the server should be for the period
        // between 00:00 and 00:30 today.
        const expectedTime = moment(timeService.now()).startOf('day').toDate()
        const submittedResponse = result.submittedResponses!![0]
        expect(submittedResponse.timeCollected).toStrictEqual(expectedTime)
        expect(submittedResponse.timeBlockLengthMin).toStrictEqual(30)
    })

    test("When user backfills responses to the beginning of the day, "
            + "should not ask to backfill at 12:00 AM anymore", () => {
        // Start on the first day.
        userSubmitsAResponse()

        // Wait until the next day
        timeService.advance(1, 'days')
        timeService.advance(30, 'minutes')

        // Submit the responses the user submits the final popup.
        userSubmitsAResponse()
        userSubmitsBackfillResponse("Some thing")
        userSubmitsBackfillResponse(YesNo.YES)
        emittedPopups.length = 0

        // Advance the time and submit another response.
        timeService.advance(15, 'minutes')
        userSubmitsAResponse()

        // Assert - there should not be a popup.
        expect(emittedPopups).toHaveLength(0)
    })
})

describe("If the user submits multiple responses to a popup", () => {
    test("Should return all of them back to the user", () => {
        userSubmitsAResponse()

        timeAdvancesForward(1, 'hours')

        // The user will now submit multiple responses
        // filling some of the previous gaps.
        const popup = mockPopup(testPoll)
        
        const response0 = mockResponse(popup)
        response0.timeCollected = moment(TEST_DATE).add(15, 'minutes').toDate()
        response0.timeBlockLengthMin = 15

        const response1 = mockResponse(popup)
        response1.timeCollected = moment(TEST_DATE).add(45, 'minutes').toDate()
        response1.timeBlockLengthMin = 15

        const responses = [ response0, response1 ]

        const responsesToSubmit = backfiller.processCollectedResponse(popup, responses)

        // Assert - the returned responses should be exactly the same as the
        // submitted responses
        expect(responsesToSubmit).toHaveLength(2)
        expect(responsesToSubmit!![0]).toBe(response0)
        expect(responsesToSubmit!![1]).toBe(response1)
    })

    test("Should use all new responses to determine the gaps", () => {
        userSubmitsAResponse()

        timeAdvancesForward(1, 'hours')

        // The user will now submit multiple responses
        // filling some of the previous gaps.
        const popup = mockPopup(testPoll)
        
        const response0 = mockResponse(popup)
        response0.timeCollected = moment(TEST_DATE).add(15, 'minutes').toDate()
        response0.timeBlockLengthMin = 15

        const response1 = mockResponse(popup)
        response1.timeCollected = moment(TEST_DATE).add(45, 'minutes').toDate()
        response1.timeBlockLengthMin = 15

        const responses = [ response0, response1 ]

        emittedPopups.length = 0
        backfiller.processCollectedResponse(popup, responses)

        // Assert - Both of the submitted responses have been
        // accounted for when figuring out the gaps to backfill..
        const expectedTime = moment(TEST_DATE).add(30, 'minutes').toDate()
        expect(emittedPopups[0].timeCollected).toStrictEqual(expectedTime)
    })
})

// =================== Helpers =================
function mockPopup(poll?: Poll, timeCollected?: Date) : PollPopup {
    if (!poll) {
        poll = testPoll
    }

    if (!timeCollected) {
        timeCollected = timeService.now()
    }

    const timeBlockLengthMin = moment.duration(poll.desiredFrequency).asMinutes()

    return {
        timeCollected: timeCollected,
        timeBlockLengthMin: timeBlockLengthMin
    } as PollPopup
}

function mockResponse(popup: PollPopup, responseText?: string) : PollResponse {
    if (!responseText) {
        responseText = "some text"
    }

    return new PollResponse({
        responseText: responseText,
        timeBlockLengthMin: popup.timeBlockLengthMin,
        timeCollected: popup.timeCollected,
        submissionType: SubmissionType.SIMPLE_POPUP
    })
}

interface UserSubmitsResponseResult {
    popup: PollPopup
    popupResponse: PollResponse
    submittedResponses: PollResponse[] | null
}

function userSubmitsAResponse(responseText?: string, popup?: PollPopup)
        : UserSubmitsResponseResult {
    if (!popup) {
        popup = mockPopup(testPoll)
    }

    const response = mockResponse(popup, responseText)
    const submittedResponse = backfiller.processCollectedResponse(popup, [response])
    return {
        popup: popup,
        popupResponse: response,
        submittedResponses: submittedResponse,
    }
}

function userSubmitsBackfillResponse(responseText: string) : UserSubmitsResponseResult {
    const emittedPopup = emittedPopups[0]
    emittedPopups.length = 0
    const response = mockResponse(emittedPopup, responseText)
    const submittedResponse = backfiller.processCollectedResponse(emittedPopup, [response])
    
    return {
        popup: emittedPopup,
        popupResponse: response,
        submittedResponses: submittedResponse
    }
}

function timeAdvancesForward(amount: number, unit: moment.DurationInputArg2) {
    const currentNow = timeService.now()
    const newNow = moment(currentNow).add(amount, unit).toDate()
    timeService.setNow(newNow)
}

