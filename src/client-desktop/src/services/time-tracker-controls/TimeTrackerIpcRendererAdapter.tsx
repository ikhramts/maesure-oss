import * as React from 'react'

import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { ipcRenderer } from 'electron';
import { IPC_CHANNEL_POLL_START, IPC_CHANNEL_POLL_STOP, IPC_CHANNEL_POLL_STATE_UPDATE, IPC_CHANNEL_USER_UPDATE } from './PollIpcChannels';

export interface TimeTrackerIpcRendererAdapterProps {
    timeTracker: TimeTrackerProxy
}

/**
 * The renderer-side adapter that allows the Main process to interface with the
 * TimeTrackerService. It does not display anything.
 */
export class TimeTrackerIpcRendererAdapter extends React.Component<TimeTrackerIpcRendererAdapterProps, {}> {
    constructor(props: TimeTrackerIpcRendererAdapterProps) {
        super(props)

        this.handleStartPoll = this.handleStartPoll.bind(this)
        this.handleStopPoll = this.handleStopPoll.bind(this)

        ipcRenderer.on(IPC_CHANNEL_POLL_START, this.handleStartPoll)
        ipcRenderer.on(IPC_CHANNEL_POLL_STOP, this.handleStopPoll)
    }

    componentDidMount() {
        ipcRenderer.send(IPC_CHANNEL_POLL_STATE_UPDATE, this.props.timeTracker.poll)
        ipcRenderer.send(IPC_CHANNEL_USER_UPDATE, this.props.timeTracker.user)
    }

    componentDidUpdate(prevProps: TimeTrackerIpcRendererAdapterProps) {
        // Check if the poll's relevant details have changed
        // If yes, then notify the main Electron process.
        const newPoll = this.props.timeTracker.poll
        const oldPoll = prevProps.timeTracker.poll
        
        let pollChanged = false

        if ((!newPoll && oldPoll) || (newPoll && !oldPoll)) {
            pollChanged = true
        
        } else if (newPoll && oldPoll) {
            const newWasStarted = newPoll.wasStarted
            const oldWasStarted = oldPoll.wasStarted
            if ((newWasStarted && !oldWasStarted) || (!newWasStarted && oldWasStarted)) {
                pollChanged = true
            }
        }

        if (pollChanged) {
            ipcRenderer.send(IPC_CHANNEL_POLL_STATE_UPDATE, newPoll)
        }

        // Check whether the user details have changed
        const newUser = this.props.timeTracker.user
        const oldUser = prevProps.timeTracker.user
        let userChanged = false

        if ((!newUser && oldUser) || (newUser && !oldUser)) {
            userChanged = true

        } else if (oldUser && newUser) {
            if (newUser.accountType != oldUser.accountType) {
                userChanged = true
            }
        }

        if (userChanged) {
            ipcRenderer.send(IPC_CHANNEL_USER_UPDATE, newUser)
        }
    }

    render() {
        return null
    }

    // ==================== Priate ====================
    private handleStartPoll(event: any, args: any) {
        this.props.timeTracker.startPoll()
    }
    
    private handleStopPoll(event: any, args: any) {
        this.props.timeTracker.stopPoll()
    }
}