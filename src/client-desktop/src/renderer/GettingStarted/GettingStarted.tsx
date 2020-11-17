import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';

import * as systemTrayScreenshot1 from '../assets/system-tray-screenshot-1.png'
import * as systemTrayScreenshot2 from '../assets/system-tray-screenshot-2.png'
import { Button } from 'antd';
import { remote } from 'electron'

export interface GettingStartedProps {
    timeTracker: TimeTrackerProxy
}

export class GettingStarted extends React.Component<GettingStartedProps,{}> {
    render() {
        const timeTracker = this.props.timeTracker

        let initialBlock : JSX.Element | null = null

        if (timeTracker.poll) {
            if (timeTracker.poll.wasStarted) {
                initialBlock = <TimeTrackerIsRunningBlock/>
            } else {
                initialBlock = <TimeTrackerIsStoppedBlock/>
            }
        }

        return <div className="gettingStarted">
            <h1>Maesure is ready to go!</h1>
            { initialBlock }
            <p>
                <img src={systemTrayScreenshot1} alt="Maesure icon is available in the system tray"/>
                <img src={systemTrayScreenshot2} alt="Right-click the Maesure icon to see the menu"/>
            </p>
            <h2>The app does not fully replace the website</h2>
            <p>To see your reports, fix submission mistakes, or and perform most other tasks go to maesure.com.</p>
            <div className="closeButton"><Button onClick={() => remote.getCurrentWindow().close() } type='primary'>Close</Button></div>
        </div>
    }
}

function TimeTrackerIsRunningBlock() {
    return <div className="gettingStartedSection">
        <h2>The time tracker is running</h2>
        <p>You should see the popups soon. You can manage the app by right-clicking on the Maesure icon in the system tray.</p>
    </div>
}

function TimeTrackerIsStoppedBlock() {
    return <div className="gettingStartedSection">
        <h2>The time tracker is currently stopped</h2>
        <p>You can start it by right-clicking on the Maesure icon in the system tray.</p>
    </div>
}