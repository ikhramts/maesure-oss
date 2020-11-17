import * as React from 'react'
import * as moment from 'moment'
import { TimeTrackerWidgetProps } from './TimeTrackerWidgetProps';
import { ConnectionState } from 'shared/time-tracking/ConnectionState';
import { Icon } from 'antd';

export class ConnectionLostNotice extends React.Component<TimeTrackerWidgetProps, {}> {
    constructor(props: TimeTrackerWidgetProps) {
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
        const timeTracker = this.props.timeTracker
        const timeToNextCheck = getTimeToNextCheck(timeTracker.nextConnectionCheckTime)

        if (timeTracker.connectionState == ConnectionState.Checking || !timeToNextCheck) {
            return <p className="widgetCenter">
                <Icon type="sync" spin /> Trying to reconnect...
            </p>
        }

        const onClickCheckNow = (evt: any) => {
            evt.preventDefault()
            timeTracker.checkConnectionNow()
        }

        return <p className="widgetCenter error">
            <Icon type="warning" /> Can't connect to Maesure.com. Will retry 
            in {timeToNextCheck}. <a href="" onClick={onClickCheckNow}>Check now</a>
        </p>
    }

    // ============== Private ==================
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
        return null
    }

    const nextCheckTimeMsec = nextCheckTime.getTime()
    const nowMsec = (new Date()).getTime()

    const secToNextCheck = Math.round((nextCheckTimeMsec - nowMsec) / 1000)

    if (secToNextCheck <= 0) {
        return null
    }

    const duration = moment(new Date(0)).add(secToNextCheck, 'seconds')
    //const duration = moment.duration(secToNextCheck, 'seconds')
    const renderedDuration = duration.format("m:ss")
    return renderedDuration
}