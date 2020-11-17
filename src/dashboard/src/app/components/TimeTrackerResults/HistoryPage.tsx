import * as React from 'react';
import * as moment from 'moment'
import { TimeLog } from 'shared/model/TimeLog';

import './HistoryPage.styl'
import { LeftActionIcon } from 'app/components/icons/LeftActionIcon';
import { RightActionIcon } from 'app/components/icons/RightActionIcon';
import { DatePicker, Icon, Tooltip, Checkbox } from 'antd';
import { AccountType } from 'shared/model/AccountType';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { HistoryRow } from './HistoryRow';
import { RangePickerValue } from 'antd/lib/date-picker/interface';
import { TimeLogDeletion } from 'shared/time-tracking/TimeLogDeletion';
import { TimeLogEntryInput } from 'shared/components/TimeLogEntryInput/TimeLogEntryInput';

export interface HistoryPageState {
    timeLog?: TimeLog
    loadingData: boolean
    selectedFromDate: Date
    selectedToDate: Date
    addingEntry: boolean
    deleting: boolean

    selectedRows: Set<string>
    selectAllChecked: boolean
}

export interface HistoryPageProps {
    timeTracker: TimeTrackerProxy
}

export class HistoryPage extends React.Component<HistoryPageProps, HistoryPageState> {
    constructor(props: HistoryPageProps) {
        super(props)

        this.reloadTimeLogEntries = this.reloadTimeLogEntries.bind(this)
        this.setTimeLog = this.setTimeLog.bind(this)
        this.onClickNextDay = this.onClickNextDay.bind(this)
        this.onClickPrevDay = this.onClickPrevDay.bind(this)
        this.onDateRangeSelected = this.onDateRangeSelected.bind(this)
        this.getCsvDownloadUrl = this.getCsvDownloadUrl.bind(this)

        this.onContentChanged = this.onContentChanged.bind(this)

        this.startNewEntry = this.startNewEntry.bind(this)
        this.onNewEntrySaved = this.onNewEntrySaved.bind(this)
        this.onNewEntryCancelled = this.onNewEntryCancelled.bind(this)

        this.onToggleSelectRow = this.onToggleSelectRow.bind(this)
        this.onClickSelectAll = this.onClickSelectAll.bind(this)

        this.deleteEnabled = this.deleteEnabled.bind(this)
        this.onClickDelete = this.onClickDelete.bind(this)

        this.state = {
            timeLog: undefined,
            loadingData: true,
            selectedFromDate: new Date,
            selectedToDate: new Date,
            addingEntry: false,
            deleting: false,

            selectedRows: new Set<string>(),
            selectAllChecked: false
        }
    }

    public componentDidMount() {
        this.reloadTimeLogEntries(this.state.selectedFromDate, this.state.selectedToDate)
    }

    componentDidUpdate(prevProps: HistoryPageProps) {
        // Check if the time tracker did anything that we should react to.
        const prevLastPollResponseChangeTime = prevProps.timeTracker.lastPollResponseChange.getTime()
        const newLastPollResponseChangeTime = this.props.timeTracker.lastPollResponseChange.getTime()

        if (prevLastPollResponseChangeTime != newLastPollResponseChangeTime) {
            this.reloadTimeLogEntries(this.state.selectedFromDate, this.state.selectedToDate)
        }
    }

    public render() {
        // Render the date picker.
        const timeTracker = this.props.timeTracker
        const user = timeTracker.user
        let datePicker : JSX.Element | null = null

        if (user && user.accountType != AccountType.TEMPORARY) {
            datePicker = <div className="inputRow">
                <LeftActionIcon onClick={this.onClickPrevDay}/>
                <DatePicker.RangePicker value={[moment(this.state.selectedFromDate), moment(this.state.selectedToDate)]} 
                                        format="YYYY-MMM-DD" onChange={this.onDateRangeSelected}
                                        allowClear={false} separator="—"/>
                <RightActionIcon onClick={this.onClickNextDay}/>
                
            </div>
        }

        // The "new entry" row.
        let newEntryRow : JSX.Element | null = null
        if (this.state.addingEntry) {
            const suggestedDate = this.state.selectedToDate
            newEntryRow = <TimeLogEntryInput 
                                className="newEntryRow"
                                timeTracker={timeTracker}
                                suggestedFromDate={suggestedDate}
                                canSubmit
                                onSaved={this.onNewEntrySaved}
                                onDiscarded={this.onNewEntryCancelled}/>
        }

        // The main data.
        let dailyLogs = this.state.timeLog;
        let statusMessage : JSX.Element | null = null
        let rows = []
        
        if (this.state.loadingData || !dailyLogs) {
            statusMessage = <p>Loading...</p>

        } else {
            for (let entry of dailyLogs.entries) {
                const rowSelected = this.state.selectAllChecked
                    || this.state.selectedRows.has(entry.id)

                rows.push(<HistoryRow 
                            dailyLogsEntry={entry} 
                            key={entry.id}
                            timeTracker={this.props.timeTracker}
                            selected={rowSelected}
                            onToggleSelect={this.onToggleSelectRow}/>)
            }

            if (!dailyLogs.entries || dailyLogs.entries.length == 0) {
                statusMessage = <p>You do not have any data for this range.</p>
            }
        }

        return <div className="dailyLogsPage">
            { datePicker }
            <table className="historyTable timeLogEntryTable">
                <thead>
                    <tr>
                        <th className="rowSelector">
                            <div className="cellContents">
                                <Checkbox checked={this.state.selectAllChecked}
                                    onChange={this.onClickSelectAll}/>  
                            </div>
                        </th>
                        <th className="fromDate">Date</th>
                        <th className="fromTime">From</th>
                        <th className="toTime">To</th>
                        <th className="timeBlockLength">Length</th>
                        <th className="entryText">
                            <span className="headerText">Activity</span>
                            <span className="actions">
                                <a className="addItem lowKey" href="" 
                                        onClick={this.startNewEntry}>
                                    <Icon type="plus" /> new
                                </a>
                                <DeleteLink enabled={this.deleteEnabled()} 
                                            deleting={this.state.deleting}
                                            onClick={this.onClickDelete}/>
                            </span>
                        </th>
                        <th className="controls">
                            <a className="downloadLink lowKey" href={this.getCsvDownloadUrl()}>
                                <Icon type="download" /> .csv
                            </a>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    { newEntryRow }
                    { rows }
                </tbody>
            </table>
            { statusMessage }
        </div>
    }

    // ================= Private ===================

    private reloadTimeLogEntries(fromDate: Date, toDate: Date) : Promise<void> {
        // Make the request.
        let fromTime = moment(fromDate).startOf('day').toDate()
        let toTime = moment(toDate).endOf('day').toDate()

       
        const apiClient = this.props.timeTracker.apiClient
        return apiClient.fetchTimeLog(fromTime, toTime)
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(this.setTimeLog)
    }

    private setTimeLog(timeLog: TimeLog | void) : Promise<void> {
        if (!timeLog) {
            return Promise.resolve()
        }

        return new Promise((resolve) => {
            this.setState({
                timeLog: timeLog,
                loadingData: false
            }, () => resolve())
        })
    }

    private onClickPrevDay() {
        let newSelectedFromDate = new Date(this.state.selectedFromDate)
        let newSelectedTomDate = new Date(this.state.selectedToDate)
        newSelectedFromDate.setDate(this.state.selectedFromDate.getDate() - 1)
        newSelectedTomDate.setDate(this.state.selectedToDate.getDate() - 1)
        this.setState({
            selectedFromDate: newSelectedFromDate,
            selectedToDate: newSelectedTomDate
        })
        this.reloadTimeLogEntries(newSelectedFromDate, newSelectedTomDate)
    }

    private onClickNextDay() {
        let newSelectedFromDate = new Date(this.state.selectedFromDate)
        let newSelectedTomDate = new Date(this.state.selectedToDate)
        newSelectedFromDate.setDate(this.state.selectedFromDate.getDate() + 1)
        newSelectedTomDate.setDate(this.state.selectedToDate.getDate() + 1)
        this.setState({
            selectedFromDate: newSelectedFromDate,
            selectedToDate: newSelectedTomDate
        })
        this.reloadTimeLogEntries(newSelectedFromDate, newSelectedTomDate)
    }

    private onDateRangeSelected(range: RangePickerValue) {
        if (!range || range.length < 2) {
            return
        }

        const from = range[0]
        const to = range[1]

        if (!from || !to)
            return

        const fromDate = from.toDate()
        const toDate = to.toDate()

        this.setState({
            selectedFromDate: fromDate,
            selectedToDate: toDate
        }, () => {
            this.reloadTimeLogEntries(fromDate, toDate)
        })
    }

    private getCsvDownloadUrl() : string {
        const fromDate = this.state.selectedFromDate
        const toDate = this.state.selectedToDate
        const fromTime = moment(fromDate).startOf('day').toDate()
        const toTime = moment(toDate).endOf('day').toDate()

        const apiClient = this.props.timeTracker.apiClient
        return apiClient.downloadDailyLogsUrl(fromTime, toTime)
    }

    private onContentChanged() {
        this.reloadTimeLogEntries(this.state.selectedFromDate, this.state.selectedToDate)
    }

    private startNewEntry(evt: any) {
        evt.preventDefault()
        this.setState({addingEntry: true})
        return false
    }

    private onNewEntrySaved() {
        // We don't need to reload any data here because
        // TimeTrackerService will notify this component
        // that the data has changed. See componentDidMount().
        this.setState({addingEntry: false})
    }

    private onNewEntryCancelled() {
        this.setState({addingEntry: false})
    }

    private onToggleSelectRow(timeLogEntryId: string) {
        const newSelectedRows = new Set<string>(this.state.selectedRows)

        // Special case: "Select all" is checked.
        if (this.state.selectAllChecked) {
            // Need to select everything except for the
            // checked row.
            const timeLog = this.state.timeLog

            if (!timeLog || !timeLog.entries) {
                // Then the hell did the user just click on?
                throw `Selecting/deselecting a non-existent row ${timeLogEntryId}`
            }

            for (const entry of timeLog.entries) {
                if (entry.id != timeLogEntryId) {
                    newSelectedRows.add(entry.id)
                }
            }

            this.setState({
                selectedRows: newSelectedRows,
                selectAllChecked: false
            })

            return
        }

        // Regular clicks on row checkboxes.
        if (newSelectedRows.has(timeLogEntryId)) {
            newSelectedRows.delete(timeLogEntryId)
        } else {
            newSelectedRows.add(timeLogEntryId)
        }

        this.setState({selectedRows: newSelectedRows})
    }

    private onClickSelectAll(evt: any) {
        if (this.state.selectAllChecked) {
            // Deselect all
            this.setState({
                selectedRows: new Set<string>(),
                selectAllChecked: false
            })
        } else {
            // Select all
            this.setState({
                selectedRows: new Set<string>(),
                selectAllChecked: true
            })
        }
    }

    private deleteEnabled() : boolean {
        const selectedItems = this.state.selectedRows
        const selectAllChecked = this.state.selectAllChecked
        return selectAllChecked || selectedItems.size > 0
    }

    private onClickDelete() {
        // Validate.
        const timeLog = this.state.timeLog
        if (!timeLog || !timeLog.entries || timeLog.entries.length == 0) {
            return
        }

        // Select the time intervals that need to be deleted.
        // Note that the deleting works buy blanking out time intervals,
        // not by deleting individual entries.
        const entries = timeLog.entries
        const deletions = []

        if (this.state.selectAllChecked) {
            // Delete everything.
            const lastEntry = entries[0]
            const firstEntry = entries[entries.length - 1]
            const fromTime = firstEntry.getFromTimeDate()
            const toTime = lastEntry.getToTime()
            deletions.push(new TimeLogDeletion({
                fromTime: fromTime,
                toTime: toTime
            }))
        } else {
            const selectedRows = this.state.selectedRows

            // Add all checked entries.
            for (const entry of entries) {
                if (!selectedRows.has(entry.id)) {
                    continue
                }

                deletions.push(new TimeLogDeletion({
                    fromTime: entry.getFromTimeAsDate(),
                    toTime: entry.getToTime()
                }))
            }
        }

        // Submit the deletion.
        this.setState({deleting: true})

        this.props.timeTracker.deleteTimeLogEntries(deletions)
            .catch(() => {
                this.setState({deleting: false})
                // TODO: figure out how to handle failures
            })
            .then(() => {
                // Don't need to update the data.
                // TimeTrackerService will notify this component
                // that the data has changed and it will refresh
                // on its own.
                // See componentDidUpdate() for implementation.

                // Clear the selected items because they're now
                // gone.
                this.setState({
                    deleting: false,
                    selectAllChecked: false,
                    selectedRows: new Set<string>()
                })
            })
    }
}

interface DeleteLinkProps {
    enabled: boolean
    deleting: boolean
    onClick: () => void
}

function DeleteLink(props: DeleteLinkProps) {
    const ignoreClick = (evt: any) => {
        evt.preventDefault()
        return false
    }
    
    if (props.deleting) {
        return <span className="disabled">
            <Icon type="sync" spin />
        </span>
    }
    
    if (!props.enabled) {
        return <a className="delete disabled" href="" onClick={ignoreClick}>
            <Tooltip title="Select rows to delete" placement="top">
                <Icon type="delete" />
            </Tooltip>
        </a>
    }

    const onClick = (evt:any) => {
        evt.preventDefault()
        props.onClick()
    }

    return <a className="lowKey delete danger" href="" onClick={onClick}>
        <Icon type="delete" />
    </a>
}