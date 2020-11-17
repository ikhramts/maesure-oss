import * as React from 'react'
import { TimeTrackerWidgetProps } from './TimeTrackerWidgetProps';
import { QuestionType } from 'shared/model/QuestionType';
import { YesNoResponseForm } from './YesNoResponseForm';
import { Icon } from 'antd';
import { SettingsForm } from './SettingsForm';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { TimeTrackerEnvironment } from 'shared/time-tracking/TimeTrackerEnvironment';
import { SimpleResponseForm } from './SimpleResponseForm';
import { DetailedResponseForm } from './DetailedResponseForm';
import { ConnectionState } from 'shared/time-tracking/ConnectionState';
import { ConnectionLostNotice } from './ConnectionLostNotice';
import { AccountType } from 'shared/model/AccountType';
import { Link } from 'react-router-dom';

export interface TimeTrackerWidgetState {
    settingsOpened: boolean
}

export class TimeTrackerWidget extends React.Component<TimeTrackerWidgetProps, TimeTrackerWidgetState> {
    constructor(props: TimeTrackerWidgetProps) {
        super(props)

        this.openSettings = this.openSettings.bind(this)
        this.closeSettings = this.closeSettings.bind(this)

        this.state = {
            settingsOpened: false
        }
    }

    render() {
        const props = this.props
        const timeTracker = props.timeTracker
        const user = timeTracker.user

        if (timeTracker.connectionState != ConnectionState.Ok) {
            return <div className="timeTrackerWidget" id="timeTrackerWidget">
                <ConnectionLostNotice timeTracker={timeTracker} />
            </div>
        }

        if (timeTracker.isLoading) {
            return <div className="timeTrackerWidget" id="timeTrackerWidget">
                <div id="timeTrackerWidget_loadingAnimation" className="widgetCenter">
                    <Icon type="loading" />
                </div>
            </div>
        }

        if (user && user.accountType == AccountType.PRO_TRIAL_EXPIRED) {
            return <div className="timeTrackerWidget" id="timeTrackerWidget">
                <div className="widgetCenter error">
                    Your trial has expired. <Link to="/enter-payment">Setup payment</Link>
                </div>
            </div>
        }

        if (!timeTracker.isRunning) {
            return <div className="timeTrackerWidget" id="timeTrackerWidget">
                <StartScreen {...props} />
            </div>
        }

        const settingsForm = this.state.settingsOpened ? <SettingsForm {...props}/> : null
        
        return <div className="timeTrackerWidget" id="timeTrackerWidget">
            <InputArea {...props} />
            { settingsForm }
            <BottomControls {...props} openSettings={this.openSettings} closeSettings={this.closeSettings} settingsOpened={this.state.settingsOpened}/>
        </div>
    }

    // ================ Private =================
    private openSettings() {
        this.setState({settingsOpened: true})
    }

    private closeSettings() {
        this.setState({settingsOpened: false})
    }
}

function InputArea(props: TimeTrackerWidgetProps) {
    const popup = props.timeTracker.showingPopup

    if (!isThisTrackerEnabled(props.timeTracker)) {

        if (props.timeTracker.user!!.flags.webTrackerEnabled === undefined) {
            const onClickTurnOnWebTracker = (evt: any) => {
                evt.preventDefault()
                props.timeTracker.enableWebTracker()
            }

            return <p id="timeTrackerWidget_waitingPlaceholder" className="waitingPlaceholder">
                We've disabled the web tracker because you're using an 
                app. <a id="timeTrackerWidget_turnBackOn" href="" onClick={onClickTurnOnWebTracker}>Turn it back on</a>
            </p>
        } else {
            return <p id="timeTrackerWidget_waitingPlaceholder" className="waitingPlaceholder">The web time tracker is disabled.</p>
        }

    } else if (!popup) {
        const poll = props.timeTracker.poll
        
        if (!poll) {
            return <p id="timeTrackerWidget_waitingPlaceholder" className="waitingPlaceholder">
                Starting up...
            </p>
        }

        return <p id="timeTrackerWidget_waitingPlaceholder" className="waitingPlaceholder">
                The time tracker is running. It will ask what you're doing every {poll.getDesiredFrequencyMin()} minutes.
            </p>

    } else if (popup.questionType == QuestionType.Simple) {
        return <SimpleResponseForm {...props} />
    } else if (popup.questionType == QuestionType.Detailed) {
        return <DetailedResponseForm {...props} />
    } else if (popup.questionType == QuestionType.YesNo) {
        return <YesNoResponseForm {...props} />
    } else {
        throw "Unknown QuestionType: " + popup.questionType
    }
}

function StartScreen(props: TimeTrackerWidgetProps) {
    const clickStart = (evt: any) => {
        evt.preventDefault()
        props.timeTracker.startPoll()
    }

    return <h1 className="startScreen">
        <a href="" id="timeTrackerWidget_startTracking" onClick={clickStart}>
            <Icon type="play-circle" theme="filled" style={{fontSize: "23pt"}}/>
             Start tracking time
        </a>
    </h1>
}


interface BottomControlsProps {
    settingsOpened: boolean
    openSettings: () => void
    closeSettings: () => void
}

function BottomControls(props: TimeTrackerWidgetProps & BottomControlsProps) {
    const timeTracker = props.timeTracker

    // Start/stop control.
    const clickStop = (evt: any) => {
        evt.preventDefault()
        timeTracker.stopPoll()
    }

    // Enable/disable web tracker control.
    let webTrackerControl : JSX.Element | null = null
    const environment = timeTracker.environment
    const user = timeTracker.user

    if (environment == TimeTrackerEnvironment.WEB
        && user && user.flags && user.flags.appInstalled) {

        if (user.flags.webTrackerEnabled) {
            const onClickDisableWebtracker = (evt: any) => {
                evt.preventDefault()
                timeTracker.disableWebTracker()
            }

            webTrackerControl = <span><a id="timeTrackerWidget_disableWebtracker" href="" onClick={onClickDisableWebtracker}>Disable web tracker</a> | </span>
        
        } else {
            const onClickEnableWebtracker = (evt: any) => {
                evt.preventDefault()
                timeTracker.enableWebTracker()
            }

            webTrackerControl = <span><a id="timeTrackerWidget_enableWebtracker" href="" onClick={onClickEnableWebtracker}>Enable web tracker</a> | </span>
        }
    }

    // Open/close settings control.
    const clickOpenSettings = (evt: any) => {
        evt.preventDefault()
        props.openSettings()
    }

    const clickCloseSettings = (evt: any) => {
        evt.preventDefault()
        props.closeSettings()
    }

    let settingsControl : JSX.Element

    if (props.settingsOpened) {
        settingsControl = <a id="timeTrackerWidget_hideSettings" href="" onClick={clickCloseSettings} >Hide frequency</a>
    } else {
        settingsControl = <a id="timeTrackerWidget_showSettings" href="" onClick={clickOpenSettings} >Change frequency</a>
    }

    return <div className="bottomControls">
        <a id="timeTrackerWidget_stop" href="" onClick={clickStop}>Stop</a> | {webTrackerControl} { settingsControl }
    </div>
}

function isThisTrackerEnabled(timeTracker: TimeTrackerProxy) : boolean {
    // The web version of the time tracker is by default turned on,
    // unless specific conditions are met for it to be off.

    if (timeTracker.environment != TimeTrackerEnvironment.WEB) {
        // This is not a web time tracker.
        return true
    }
    
    const poll = timeTracker.poll
    const user = timeTracker.user

    if (!poll || !user) {
        // Nothing is running, so there is nothing to turn off.
        return true
    }

    if (!user.flags) {
        // No user flags have been set, so the web tracker has not been
        // turned off.
        return true
    }

    if (user.flags.appInstalled && !user.flags.webTrackerEnabled) {
        // The user has started using a non-web tracker and has not
        // explicitly enabled the web tracker. 
        // Don't bother the user while they visit the website.
        return false
    }

    return true
}

