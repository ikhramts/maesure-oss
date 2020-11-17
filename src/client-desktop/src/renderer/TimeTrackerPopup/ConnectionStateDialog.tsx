import * as React from 'react'
import * as moment from 'moment'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { Button, Icon } from 'antd';
import { ConnectionState } from 'shared/time-tracking/ConnectionState';

export interface ConnectionStateDialogProps {
    timeTracker: TimeTrackerProxy
    onClose: () => void
}

export class ConnectionStateDialog 
extends React.Component<ConnectionStateDialogProps, {}> {
    constructor(props: ConnectionStateDialogProps) {
        super(props)

        this.scheduleReload = this.scheduleReload.bind(this)
    }
    
    componentDidMount() {
        this.scheduleReload()
    }
    
    componentWillUnmount() {
        this._unmounted = true
    }

    render() {
        // const timeTracker = this.props.timeTracker
        // const connectionState = timeTracker.connectionState
        const timeTracker = this.props.timeTracker
        const timeToNextCheck = getTimeToNextCheck(timeTracker.nextConnectionCheckTime)

        // Event handlers
        const onClose = (evt: any) => {
            evt.preventDefault()
            this.props.onClose()
        }

        const onClickCheckNow = (evt: any) => {
            evt.preventDefault()
            timeTracker.checkConnectionNow()
        }

        // Decide what to display
        let message : JSX.Element
        const connectionState = timeTracker.connectionState

        if (connectionState == ConnectionState.Ok) {
            message = <p>Maesure reconnected!</p>
        } else if (connectionState == ConnectionState.Checking) {
            message = <p><Icon type="sync" spin /> Trying to reconnect to maesure.com...</p>
        } else {
            message = <p className="error">
                Maesure lost connection with the server. Will keep trying 
                to reconnect; next attempt in: {timeToNextCheck}
                . <a href="" onClick={onClickCheckNow}>Try now</a>
            </p>
        }

        return <div className="timeTrackerWidget connectionStateDialog">
            { message }
            <div className="closeButton">
                <Button type="primary" onClick={onClose}>Close</Button>
            </div>
        </div>
    }

    // =================== Private =======================
    private _unmounted = false

    private scheduleReload() {
        // Reload every second to update the countdown.
        const now = new Date()
        const nowMsec = now.getTime()
        const timeoutAtMsec = moment(now).startOf('second')
                                        .add(1, 'second')
                                        .add(1, 'millisecond')
                                        .toDate()
                                        .getTime()
        
        const timeoutPeriod = timeoutAtMsec - nowMsec

        setTimeout(() => {
            if (this._unmounted) {
                return
            }

            // This should force a refresh.
            //this.setState({now: new Date()})
            this.forceUpdate()
            this.scheduleReload()
        }, timeoutPeriod)
    }
}

function getTimeToNextCheck(nextCheckTime: Date | null) {
    if (nextCheckTime == null) {
        return "0:00"
    }

    const nextCheckTimeMsec = nextCheckTime.getTime()
    const nowMsec = (new Date()).getTime()

    const secToNextCheck = Math.round((nextCheckTimeMsec - nowMsec) / 1000)

    if (secToNextCheck <= 0) {
        return "0:00"
    }

    const duration = moment(new Date(0)).add(secToNextCheck, 'seconds')
    //const duration = moment.duration(secToNextCheck, 'seconds')
    const renderedDuration = duration.format("m:ss")
    return renderedDuration
}