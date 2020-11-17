import * as React from 'react'
import { TimeLogEntry } from 'shared/model/TimeLogEntry';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { HistoryRowViewer } from './HistoryRowViewer';
import { TimeLogEntryInput } from 'shared/components/TimeLogEntryInput/TimeLogEntryInput';

export interface HistoryRowProps {
    dailyLogsEntry: TimeLogEntry
    timeTracker: TimeTrackerProxy
    selected: boolean
    onToggleSelect: (timeLogEntryId: string) => void
}

export interface HistoryRowState {
    editing: boolean
}

export class HistoryRow extends React.Component<HistoryRowProps, HistoryRowState> {
    constructor(props: HistoryRowProps) {
        super(props)

        this.onEditStart = this.onEditStart.bind(this)
        this.onEditCancel = this.onEditCancel.bind(this)

        this.state = {
            editing: false,
        }
    }

    render() {
        const dailyLogsEntry = this.props.dailyLogsEntry
        const timeTracker = this.props.timeTracker

        if (this.state.editing) {
            // Note: we don't need to handle 
            // HistoryRowEditor.onSaved() because:
            //
            // (1) TimeTrackerService will tell HistoryPage
            //     that the data has changed and it needs to 
            //     reload, and
            //
            // (2) the save will create a new TimeLogEntry 
            //     with a new ID (=new row key), which
            //     will cause React to get rid of this instance
            //     of HistoryRow and replace it with a fresh
            //     instance.
            return <TimeLogEntryInput 
                timeLogEntry={dailyLogsEntry} 
                timeTracker={timeTracker}
                canSubmit
                onDiscarded={this.onEditCancel}
                autofocusOnEntryText />
        } else {
            return <HistoryRowViewer 
                dailyLogsEntry={dailyLogsEntry} 
                timeTracker={timeTracker} 
                selected={this.props.selected}
                onEditStart={this.onEditStart}
                onToggleSelect={this.props.onToggleSelect}/>
        }
    }

    // =============== Private ====================
    private onEditStart() {
        this.setState({editing: true})
    }

    private onEditCancel() {
        this.setState({editing: false})
    }
}