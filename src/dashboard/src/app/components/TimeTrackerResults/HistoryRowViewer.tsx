import * as React from 'react'
import * as moment from 'moment'
import { TimeLogEntry } from 'shared/model/TimeLogEntry';
import { ActionIcon } from '../../../../../shared/components/ActionIcon';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { formatDuration } from 'shared/utils/time/TimeFormats'
import { Checkbox } from 'antd';

export interface HistoryRowViewerProps {
    dailyLogsEntry: TimeLogEntry
    timeTracker: TimeTrackerProxy
    selected: boolean
    onEditStart: () => void
    onToggleSelect: (timeLogEntryId: string) => void
}

export class HistoryRowViewer extends React.Component<HistoryRowViewerProps, {}> {
    constructor(props: HistoryRowViewerProps) {
        super(props)
    }

    render() {
        const dailyLogEntry = this.props.dailyLogsEntry
        const fromDate = moment(dailyLogEntry.fromTime).format("YYYY-MMM-DD")
        const fromTime = moment(dailyLogEntry.fromTime).format("H:mm")
        const toTime = moment(dailyLogEntry.getToTime()).format("H:mm")
        const timeBlockLength = formatDuration(dailyLogEntry.timeBlockLength)
        const entryText = dailyLogEntry.entryText
    
        const onClickEdit = () => {
            this.props.onEditStart()
        }

        const onClickCheckbox = (evt:any) => {
            //evt.preventDefault()
            this.props.onToggleSelect(dailyLogEntry.id)
        }

        return <tr className="topLevel historyRowViewer">
            <td className="rowSelector">
                <div className="cellContents">
                    <Checkbox 
                            checked={this.props.selected} 
                            onChange={onClickCheckbox}/>  
                    </div>
            </td>
            <td className="fromDate"><div className="cellContents">{ fromDate }</div></td>
            <td className="fromTime"><div className="cellContents">{ fromTime }</div></td>
            <td className="toTime"><div className="cellContents">{ toTime }</div></td>
            <td className="timeBlockLength">
                <div className="cellContents">{ timeBlockLength }</div>
            </td>
            <td className="entryText">
                <div className="cellContents">{entryText}</div>
            </td>
            <td className="controls">
                <div className="cellContents">
                    <ActionIcon className="testhandle-icon-edit" type="edit" 
                                onClick={onClickEdit} toolTip="Edit"/>
                </div>
            </td>
        </tr>
    }
}