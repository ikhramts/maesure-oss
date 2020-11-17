import * as React from 'react'
import * as moment from 'moment'
import { TimeLogEntry } from 'shared/model/TimeLogEntry';
import { DatePicker,  Button, Icon } from 'antd';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { formatDurationFromMin } from 'shared/utils/time/TimeFormats'
import { EntryTextAutocomplete } from 'shared/components/EntryTextAutocomplete/EntryTextAutocomplete';
import { PollResponse } from 'shared/model/PollResponse';
import { TimeInput, TimeInputInvalidValue } from 'shared/components/TimeInput/TimeInput';
import { TimeLogEntrySuggestion } from 'shared/model/TimeLogEntrySuggestion';
import { ActionIcon } from 'shared/components/ActionIcon';
import { minuteOfDay } from 'shared/utils/time/timeUtils'
import { SubmissionType } from 'shared/model/SubmissionTypes';
import { TimeLogDeletion } from 'shared/time-tracking/TimeLogDeletion';

export type TimeLogEntryInputProps = {
    timeLogEntry?: TimeLogEntry
    timeTracker: TimeTrackerProxy

    className?: string
    canSubmit?: boolean
    discardIconType?: string
    autofocusOnEntryText?: boolean

    onSaved?: () => void
    onDiscarded: () => void
    onChanged?: (pollResponse: PollResponse | null) => void
    onUserInteracted?: () => void

} & TimeLogEntrySuggestion

export interface TimeLogEntryInputState {
    fromDate?: moment.Moment
    fromTime: Date | TimeInputInvalidValue | null
    toTime: Date | TimeInputInvalidValue | null
    entryText: string

    timeBlockLength: string

    fromDateTouched: boolean
    fromTimeTouched: boolean
    toTimeTouched: boolean
    entryTextTouched: boolean

    autofocusFromDate: boolean
    autofocusFromTime: boolean
    autofocusToTime: boolean
    autofocusEntryText: boolean

    submitting: boolean
    serverError: string | null
}

export class TimeLogEntryInput 
extends React.Component<TimeLogEntryInputProps, TimeLogEntryInputState> {
    constructor(props: TimeLogEntryInputProps) {
        super(props)

        // Binds
        this.onFromDateChanged = this.onFromDateChanged.bind(this)
        this.onFromTimeChanged = this.onFromTimeChanged.bind(this)
        this.onToTimeChanged = this.onToTimeChanged.bind(this)
        this.onEntryTextChanged = this.onEntryTextChanged.bind(this)

        this.updateTimeBlockLength = this.updateTimeBlockLength.bind(this)

        this.submit = this.submit.bind(this)
        this.cancel = this.cancel.bind(this)

        this.isFromDateValid = this.isFromDateValid.bind(this)
        this.isFromTimeValid = this.isFromTimeValid.bind(this)
        this.isToTimeValid = this.isToTimeValid.bind(this)
        this.isTimeRangeValid = this.isTimeRangeValid.bind(this)
        this.isEntryTextValid = this.isEntryTextValid.bind(this)
        this.isValid = this.isValid.bind(this)

        this.emitPollResponse = this.emitPollResponse.bind(this)
        this.getPollResponse = this.getPollResponse.bind(this)

        this.emitUserInteracted = this.emitUserInteracted.bind(this)

        // Prep the initial "from" date.
        const entry = this.props.timeLogEntry

        let fromDate : moment.Moment | undefined

        if (entry) {
            fromDate = moment(entry.fromTime).startOf('date')
        } else if (props.suggestedFromDate) {
            fromDate = moment(props.suggestedFromDate).startOf('date')
        }

        let fromTime = null

        if (entry) {
            fromTime = entry.getFromTimeAsDate()
        } else if (this.props.suggestedFromTime) {
            fromTime = this.props.suggestedFromTime
        }

        let toTime = null

        if (entry) {
            toTime = entry.getToTime()
        } else if (this.props.suggestedToTime) {
            toTime = this.props.suggestedToTime
        }

        let entryText = ""

        if (entry) {
            entryText = entry.entryText
        } else if (this.props.suggestedEntryText) {
            entryText = this.props.suggestedEntryText
        }

        let timeBlockLength = ""

        if (fromTime && toTime) {
            let timeBlockLengthMin = getTimeBlockLengthMin(fromTime!!, toTime!!)
            timeBlockLength = formatDurationFromMin(timeBlockLengthMin)
        }

        // Prep what to auto-focus on.
        let autofocusFromDate = false
        let autofocusFromTime = false
        let autofocusToTime = false
        let autofocusEntryText = false

        if (entry) {
            autofocusEntryText = true
        } else {
            if (!this.props.suggestedFromDate) {
                autofocusFromDate = true
            } else if (!this.props.suggestedFromTime) {
                autofocusFromTime = true
            } else if (!this.props.suggestedToTime) {
                autofocusToTime = true
            } else {
                autofocusEntryText = true
            }
        }

        this.state = {
            fromDate: fromDate,
            fromTime: fromTime,
            toTime: toTime,
            entryText: entryText,

            timeBlockLength: timeBlockLength,

            fromDateTouched: false,
            fromTimeTouched: false,
            toTimeTouched: false,
            entryTextTouched: false,

            autofocusFromDate: autofocusFromDate,
            autofocusFromTime: autofocusFromTime,
            autofocusToTime: autofocusToTime,
            autofocusEntryText: autofocusEntryText,
            
            submitting: false,
            serverError: null
        }
    }

    componentDidUpdate(oldProps: TimeLogEntryInputProps) {
        const state = this.state
        const props = this.props

        if (!state.fromDateTouched && oldProps.suggestedFromDate != props.suggestedFromDate) {
            if (props.suggestedFromDate) {
                this.setState({fromDate: moment(props.suggestedFromDate)})
            }
        }

        if (!state.fromTimeTouched && oldProps.suggestedFromTime != props.suggestedFromTime) {
            this.setState({
                fromTime: props.suggestedFromTime ?? null
            }, () => {this.updateTimeBlockLength()})
        }

        if (!state.toTimeTouched && oldProps.suggestedToTime != props.suggestedToTime) {
            this.setState({
                toTime: props.suggestedToTime ?? null
            }, () => {this.updateTimeBlockLength()})
        }

        if (!state.entryTextTouched && oldProps.suggestedEntryText != props.suggestedEntryText) {
            this.setState({entryText: props.suggestedEntryText ?? ""})
        }
    }

    render() {
        const timeTracker = this.props.timeTracker
        const state = this.state

        // Figure out whether the inputs are valid.
        const isValid = this.isValid()

        let fromDateClass : string | undefined
        let fromTimeClass : string | undefined
        let toTimeClass : string | undefined
        let entryTextClass : string | undefined
        const notices : JSX.Element[] = []

        if (!isValid) {
            const isFromDateValid = !state.fromDateTouched || this.isFromDateValid()
            const isFromTimeValid = !state.fromTimeTouched || this.isFromTimeValid()
            const isToTimeValid = !state.toTimeTouched || this.isToTimeValid()
            const isTimeRangeValid = 
                !(state.fromTimeTouched || state.toTimeTouched)
                || this.isTimeRangeValid()
            const isEntryTextValid = !state.entryTextTouched || this.isEntryTextValid()
    
            if (!isFromDateValid) {
                fromDateClass = "error"
                notices.push(<p key="date" className="error">Date cannot be blank.</p>)
            }
            
            if (!isFromTimeValid) {
                fromTimeClass = "error"
                notices.push(<p key="from" className="error">'From' time doesn't look right.</p>)
            }
            
            if (!isToTimeValid) {
                toTimeClass = "error"
                notices.push(<p key="to" className="error">'To' time doesn't look right.</p>)
            }
            
            if (!isTimeRangeValid) {
                fromTimeClass = "error"
                toTimeClass = "error"
                notices.push(<p key="range" className="error">'To' time should be after 'From' time.</p>)
            }

            if (!isEntryTextValid) {
                entryTextClass =  "error"
                notices.push(<p key="entryText" className="error">Activity cannot be blank.</p>)
            }
        }

        // Display any errors or warnings.
        if (this.state.serverError) {
            notices.push(<p key="serverError" className="error">Could not save - try again in a bit.</p>)
        }

        let noticesRow : JSX.Element | null = null

        if (notices.length > 0 || this.state.serverError) {
            noticesRow = <tr key="notices">
                <td className="notices" colSpan={6}>
                    { notices }
                </td>
            </tr>
        }

        // Figure out what to autofocus on.
        const autofocusFromTime = !this.props.autofocusOnEntryText
        const autofocusEntryText = this.props.autofocusOnEntryText

        // Render the save button.
        let submitButton : JSX.Element | null = null

        if (this.props.canSubmit) {
            const submitting = this.state.submitting
            const submitButtonContent = 
                submitting ? <Icon type="sync" spin={true}/> : <Icon type="check" />
            const submitButtonClass = submitting ? "saveButton submitting" : "saveButton"

            submitButton = <Button className={submitButtonClass} 
                                    type="primary"
                                    disabled={(!isValid) || submitting}
                                    onClick={this.submit}>
                                { submitButtonContent }
                           </Button>
        }

        // Discard icon
        const discardIconType = this.props.discardIconType || "close"

        // Render everything.
        let rowClassName = "topLevel historyRowEditor"
        if (this.props.className) {
            rowClassName += " " + this.props.className
        }

        return [<tr className={rowClassName} key="main">
            <td className="rowSelector"></td>
            <td className="fromDate">
                <div className="cellContents">
                    <DatePicker className={fromDateClass}
                        value={this.state.fromDate}
                        format="YYYY-MM-DD"
                        placeholder=""
                        onChange={this.onFromDateChanged}/>
                </div>
            </td>
            <td className="fromTime">
                <div className="cellContents">
                    <TimeInput className={fromTimeClass}
                            value={this.state.fromTime}
                            format="H:mm"
                            placeholder="hh:mm"
                            onChange={this.onFromTimeChanged} 
                            autoFocus={autofocusFromTime}
                            onUserInteracted={this.emitUserInteracted}/>
                </div>
            </td>
            <td className="toTime">
                <div className="cellContents">
                    <TimeInput className={toTimeClass}
                            value={this.state.toTime}
                            format="H:mm"
                            placeholder="hh:mm"
                            onChange={this.onToTimeChanged} 
                            onUserInteracted={this.emitUserInteracted}/>
                </div>
            </td>
            <td className="timeBlockLength inTimeLogEntryInput">
                <div className="cellContents">{ this.state.timeBlockLength }</div>
            </td>
            <td className="entryText">
                <div className="cellContents inTimeLogEntryInput">
                    <EntryTextAutocomplete className={entryTextClass}
                        value={this.state.entryText}
                        responseSuggestionService={timeTracker.responseSuggestionService}
                        onChanged={this.onEntryTextChanged}
                        onSubmit={this.submit}
                        onSelect={this.onEntryTextChanged}
                        autoFocus={autofocusEntryText}
                        onUserInteracted={this.emitUserInteracted}/>
                    
                    { submitButton }
                </div>
            </td>
            <td className="controls inTimeLogEntryInput">
                <div className="cellContents">
                    <ActionIcon className="testhandle-icon-close" type={discardIconType} 
                                onClick={this.cancel}/>
                </div>
            </td>
        </tr>,
        noticesRow
        ]
   }

    // ==================== Private ======================
    private onFromDateChanged(fromDate: moment.Moment) {
        this.setState({
            fromDate: fromDate,
            fromDateTouched: true,
        }, () => {
            this.emitUserInteracted()
            this.emitPollResponse()
        })
    }

    private onFromTimeChanged(fromTime: Date | TimeInputInvalidValue | null) {
        const oldFromTime = this.state.fromTime
        const oldTouched = this.state.fromTimeTouched
        
        const valueChanged = TimeInput.timeOfDayChanged(oldFromTime, fromTime)

        this.setState({
            fromTime: fromTime,
            fromTimeTouched: oldTouched || !!valueChanged,
        }, () => {
            this.emitUserInteracted()

            if (valueChanged) {
                this.updateTimeBlockLength()
                this.emitPollResponse()
            }
        })
    }

    private onToTimeChanged(toTime: Date | TimeInputInvalidValue | null) {
        const oldToTime = this.state.toTime
        const oldTouched = this.state.toTimeTouched
        
        const valueChanged = TimeInput.timeOfDayChanged(oldToTime, toTime)

        this.setState({
            toTime: toTime,
            toTimeTouched: oldTouched || !!valueChanged,
        }, () => {
            this.emitUserInteracted()

            if (valueChanged) {
                this.updateTimeBlockLength()
                this.emitPollResponse()
            }
        })
    }

    private onEntryTextChanged(text: string) {
        this.setState({
            entryText: text,
            entryTextTouched: true,
        }, () => {
            this.emitUserInteracted()
            this.emitPollResponse()
        })
    }

    private updateTimeBlockLength() {
        if (this.isFromTimeValid() && this.isToTimeValid() && this.isTimeRangeValid()) {
            // Past this point everything should be not null and have the right type.
            const fromTime = this.state.fromTime as Date
            const toTime = this.state.toTime as Date
    
            const timeBlockLengthMin = getTimeBlockLengthMin(fromTime!!, toTime!!)
            const timeBlockLength = formatDurationFromMin(timeBlockLengthMin)

            this.setState({
                timeBlockLength: timeBlockLength
            })
        } else {
            this.setState({
                timeBlockLength: ""
            })
        }
    }

    private submit(evt?: any) {
        // 'evt' can be an event, a boolean, undefined, or anything else.
        evt?.preventDefault?.()

        if (!this.props.canSubmit) {
            return
        }
        
        // Prepare the new time log entry.
        const entry = this.getPollResponse()

        if (!entry) {
            return
        }

        entry.submissionType = SubmissionType.MANUAL
        
        // If there was an old TimeLogEntry, need to delete it.
        let deletions : TimeLogDeletion[] | null = null
        const oldEntry = this.props.timeLogEntry

        if (oldEntry) {
            deletions = []
            deletions.push(new TimeLogDeletion({
                fromTime: oldEntry.getFromTimeAsDate(),
                toTime: oldEntry.getToTime()
            }))
        }

        const apiClient = this.props.timeTracker.apiClient
        this.setState({submitting: true})
        apiClient.updateTimeLog([entry], deletions)
            .catch((err) => this.setState({submitting: false, serverError: ""+ err}))
            .then(() => {
                if (this.props.onSaved) {
                    this.props.onSaved()
                }
            })
    }

    private cancel() {
        this.props.onDiscarded()
    }

    private isFromDateValid() : boolean {
        return !!this.state.fromDate
    }

    private isFromTimeValid() : boolean {
        return !!this.state.fromTime && moment.isDate(this.state.fromTime)
    }

    private isToTimeValid() : boolean {
        return !!this.state.toTime && moment.isDate(this.state.toTime)
    }

    private isTimeRangeValid(): boolean {
        const fromTime = this.state.fromTime
        const toTime = this.state.toTime

        if (fromTime && toTime) {
            // Keep in mind: due to various quirks, toTime and fromTime
            // may be on different days. We only care about the time portions,
            // so we should not compare the dates directly.
            return minuteOfDay(toTime) > minuteOfDay(fromTime)
        } else {
            return true
        }
    }

    private isEntryTextValid() : boolean {
        // Must be non-falsy and not just whitespace
        const entryText = this.state.entryText
        return !(!entryText) && /\S/.test(entryText)
    }

    private isValid() : boolean {
        return this.isFromDateValid()
            && this.isFromTimeValid()
            && this.isToTimeValid()
            && this.isTimeRangeValid()
            && this.isEntryTextValid()
    }

    private emitPollResponse() {
        this.props.onChanged?.(this.getPollResponse())
    }

    private getPollResponse() : PollResponse | null {
        const state = this.state

        if (!this.isValid()) {
            return null
        }

        // Past this point, nothing important should be null or have wrong type.

        // Keep in mind that fromTime and toTime may have an 
        // arbitrary date component, which we should ignore.
        const fromDate = state.fromDate
        const fromTime = state.fromTime as Date
        const toTime = state.toTime as Date
        const from = combineDateTime(fromDate!!, fromTime!!)
        const timeBlockLengthMin = getTimeBlockLengthMin(fromTime!!, toTime!!)
        
        const pollResponse = new PollResponse({
            timeCollected: from,
            timeBlockLengthMin: timeBlockLengthMin,
            responseText: state.entryText
        })

        return pollResponse
    }

    private emitUserInteracted(evt?: any) {
        evt?.preventDefault()
        this.props.onUserInteracted?.()
    }
}

function combineDateTime(date: moment.Moment, time: Date) : Date {
    const startOfDay = date.startOf('day')
    const minuteOfDay = time.getHours() * 60 + time.getMinutes()
    const dateTime = startOfDay.clone().add(minuteOfDay, 'minutes')
    return dateTime.toDate()
}

function getTimeBlockLengthMin(fromTime: Date, toTime: Date) : number {
    const fromMinOfDay = minuteOfDay(fromTime)
    const toMinOfDay = minuteOfDay(toTime)
    const minutes = toMinOfDay - fromMinOfDay
    return minutes
}


