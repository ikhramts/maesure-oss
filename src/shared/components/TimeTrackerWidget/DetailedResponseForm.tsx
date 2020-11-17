import * as React from 'react'
import * as uuid from 'uuid-random'
import * as moment from 'moment'

import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { TimeLogEntrySuggestion } from 'shared/model/TimeLogEntrySuggestion';
import { PollResponse } from 'shared/model/PollResponse';
import { TimeLogEntryInput } from '../TimeLogEntryInput/TimeLogEntryInput';
import { Button, Icon } from 'antd';
import { TimeLogEntry } from 'shared/model/TimeLogEntry';
import { PollPopup } from 'shared/model/PollPopup';
import { SubmissionType } from 'shared/model/SubmissionTypes';

export interface DetailedResponseFormProps {
    timeTracker: TimeTrackerProxy
}

export interface DetailedResponseFormState {
    rowStates: RowState[]
    touched: boolean
}

export interface RowState {
    rowId: string
    pollResponse: PollResponse | null
    suggestedValue: TimeLogEntrySuggestion
}

export class DetailedResponseForm
extends React.Component<DetailedResponseFormProps, DetailedResponseFormState> {
    constructor(props: DetailedResponseFormProps) {
        super(props)

        // Bindings
        this.onClickAddRow = this.onClickAddRow.bind(this)
        this.onClickRemoveRow = this.onClickRemoveRow.bind(this)
        this.onSubmit = this.onSubmit.bind(this)
        this.onRowValueChanged = this.onRowValueChanged.bind(this)
        this.isValid = this.isValid.bind(this)

        this.onUserInteracted = this.onUserInteracted.bind(this)
        this.scheduleRefresh = this.scheduleRefresh.bind(this)
        this.updateToTimeToNow = this.updateToTimeToNow.bind(this)

        // Initialize the state.
        const timeTracker = props.timeTracker
        const popup = timeTracker.showingPopup!!
        const lastEntry = todaysLastEntry(timeTracker.recentEntries)

        this.state = {
            rowStates: [
                {
                    rowId: uuid(),
                    pollResponse: null,
                    suggestedValue: initFirstRow(popup, lastEntry)
                }
            ],
            touched: false
        }
    }

    componentDidMount() {
        this.scheduleRefresh()
    }

    componentWillUnmount() {
        this._unmounted = true
    }

    render() {
        const timeTracker = this.props.timeTracker
        const popupService = timeTracker.popupService

        const onSwitchFormClicked = (evt: any) => {
            evt.preventDefault()
            popupService.switchToSimplePopup()
        }

        // TODO: render the rows
        const rows : JSX.Element[] = []
        const rowStates = this.state.rowStates

        for (let i = 0; i < rowStates.length; i++) {
            const rowState = rowStates[i]

            const onRowValueChanged = (pollResponse: PollResponse | null) => {
                this.onRowValueChanged(i, pollResponse)
            }

            const row = <TimeLogEntryInput key={rowState.rowId}
                            timeTracker={timeTracker}
                            {...rowState.suggestedValue}
                            discardIconType="delete"
                            onDiscarded={() => this.onClickRemoveRow(i)}
                            onChanged={onRowValueChanged}
                            onUserInteracted={this.onUserInteracted}/>
            rows.push(row)
        }

        return <div className="detailedResponseForm">
            <table className="timeLogEntryTable">
                <thead>
                    <tr>
                        <th className="rowSelector"></th>
                        <th className="fromDate">Date</th>
                        <th className="fromTime">From</th>
                        <th className="toTime">To</th>
                        <th className="timeBlockLength">Length</th>
                        <th className="entryText">
                            <span className="headerText">Activity</span>
                            <span className="actions">
                                <a className="addRow" href="" 
                                        onClick={this.onClickAddRow}>
                                    <Icon type="plus" /> add row
                                </a>
                            </span>
                        </th>
                        <th className="controls"></th>
                    </tr>
                </thead>
                <tbody>
                    { rows }
                </tbody>
            </table>
            <p>
                <Button id="timeTrackerWidget_submit" type="primary"
                    disabled={!this.isValid()} onClick={this.onSubmit}>Submit</Button>
                <a href="" onClick={onSwitchFormClicked}>Fewer details</a>
            </p>
        </div>
    }

    // ===================== Private ===================
    private _unmounted = false

    private onClickAddRow(evt: any) {
        evt.preventDefault()

        const newRowStates = this.state.rowStates.slice() // = clone
        newRowStates.push({
            rowId: uuid(),
            pollResponse: null,
            suggestedValue: initRow()
        })

        this.setState({
            rowStates: newRowStates,
            touched: true
        })
    }

    private onClickRemoveRow(rowNum: number) {
        const newRowStates = this.state.rowStates.slice() // = clone
        newRowStates.splice(rowNum, 1)

        this.setState({
            rowStates: newRowStates,
            touched: true
        })
    }

    private onSubmit(evt: any) {
        evt.preventDefault()
        
        // Complicated
        if (!this.isValid()) {
            return
        }
        
        const popup = this.props.timeTracker.showingPopup!!
        const responses = this.state.rowStates.map(r => r.pollResponse!!)
        const popupService = this.props.timeTracker.popupService
        popupService.popupCompleted(popup, responses)

        return false
    }

    private onRowValueChanged(rowNum: number, pollResponse: PollResponse | null) {
        const newRowStates = this.state.rowStates.slice() // = clone
        const oldState = newRowStates[rowNum]

        if (pollResponse) {
            pollResponse.submissionType = SubmissionType.DETAILED_POPUP
        }

        newRowStates[rowNum] = {
            rowId: oldState.rowId,
            pollResponse: pollResponse,
            suggestedValue: oldState.suggestedValue
        }

        this.setState({
            rowStates: newRowStates,
            touched: true
        })
    }

    private onUserInteracted() {
        //this.setState({touched: true})
    }

    private isValid() {
        const rowStates = this.state.rowStates

        if (rowStates.length == 0) {
            return false
        }

        for (const rowState of rowStates) {
            if (!rowState.pollResponse) {
                return false
            }
        }

        return true
    }

    private scheduleRefresh() {
        // Update the toTime in the first row to now
        // every minute.
        const nextRefreshTimeMsec = 
            moment().startOf('minute').add(1, 'minute').add(3, 'seconds').toDate().getTime()
        const nowMsec = new Date().getTime()
        const timeoutMsec = nextRefreshTimeMsec - nowMsec

        setTimeout(() => {
            if (this._unmounted) {
                return
            }

            this.updateToTimeToNow()
            this.scheduleRefresh()
        }, timeoutMsec)

    }

    private updateToTimeToNow() {
        const state = this.state
        if (this.state.touched) {
            return
        }

        if (this.state.rowStates.length == 0) {
            // This should not happen
            console.error('DetailedResponseForm.state.rowStates has no elements')
            return
        }

        const timeTracker = this.props.timeTracker
        const popup = timeTracker.showingPopup!!
        const lastEntry = todaysLastEntry(timeTracker.recentEntries)

        // const oldSuggestions = state.rowStates[0].suggestedValue
        // const newSuggestions = {
        //     suggestedFromDate: oldSuggestions.suggestedFromDate,
        //     suggestedFromTime: oldSuggestions.suggestedFromTime,
        //     suggestedToTime: moment().startOf('minute').toDate(),
        //     suggestedEntryText: oldSuggestions.suggestedEntryText
        // } as TimeLogEntrySuggestion

        this.setState({
            rowStates: [{
                    pollResponse: null,
                    rowId: state.rowStates[0].rowId,
                    suggestedValue: initFirstRow(popup, lastEntry)
                }
            ]
        })
    }
}

function initFirstRow(popup: PollPopup,
                     lastEntry: TimeLogEntry | null) : TimeLogEntrySuggestion {
    const thisMinute = moment().startOf('minute').toDate()
    const today = moment().startOf('day').toDate()

    if (!lastEntry) {
        // There are no entries today. Suggest only a toTime.
        return {
            suggestedFromDate: today,
            suggestedToTime: thisMinute
        }
    }

    // There's an entry for today already.
    const lastEntryToTime = lastEntry.getToTime()
    const lastEntryTimeMsec = lastEntryToTime.getTime()

    if (lastEntryTimeMsec > thisMinute.getTime()) {
        // The last entry ends in the future. Not sure what
        // the user would want here.
        // Suggest only today's date.
        return {
            suggestedFromDate: today,
        }
    }

    // If the last entry's toTime = this popup's fromTime,
    // suggest a more sensible toTime. 
    if (lastEntryTimeMsec == popup.timeCollected.getTime()) {
        let fromTime : Date | undefined = undefined
        let toTime = popup.getToTime()

        if (today.getTime() < lastEntryToTime.getTime()) {
            fromTime = lastEntryToTime
        }

        if (thisMinute.getTime() > toTime.getTime()) {
            toTime = thisMinute
        }

        return {
            suggestedFromDate: today,
            suggestedFromTime: fromTime,
            suggestedToTime: toTime
        }    
    }

    // The last entry was in the past today.
    // Suggest the start and end time based on that entry.
    return {
        suggestedFromDate: today,
        suggestedFromTime: lastEntryToTime,
        suggestedToTime: thisMinute
    }
}

function initRow() : TimeLogEntrySuggestion {
    return {
        suggestedFromDate: moment().startOf('day').toDate(),
    }
}

function todaysLastEntry(timeLogEntries: TimeLogEntry[]) : TimeLogEntry | null {
    // Remember: the entries should already be sorted from the
    // latest to the earliest. 
    const todayEndOfDayMsec = moment().startOf('day').add(1, 'days').toDate().getTime()
    const todayStartOfDayMsec = moment().startOf('day').toDate().getTime()

    for (const entry of timeLogEntries) {
        const entryToTimeMsec = entry.getToTime().getTime()

        if (entryToTimeMsec <= todayEndOfDayMsec && entryToTimeMsec > todayStartOfDayMsec) {
            // This is today's entry.
            return entry

        } else if (entryToTimeMsec <= todayStartOfDayMsec) {
            // No entries have been made today.
            return null
        }
    }

    // Didn't find anything relevant.
    return null
}
