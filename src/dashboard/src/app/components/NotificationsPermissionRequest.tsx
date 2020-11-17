import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { CSSTransition } from 'react-transition-group';

export interface NotificationsPermissionRequestProps {
    timeTracker: TimeTrackerProxy
}

export interface NotificationsPermissionRequestState {
    canShow: boolean
}

export class NotificationsPermissionRequest extends React.Component<NotificationsPermissionRequestProps, NotificationsPermissionRequestState> {
    constructor(props: NotificationsPermissionRequestProps) {
        super(props)

        this.state = {
            canShow: false
        }
    }

    componentDidMount() {
        setTimeout(() => {
            this.setState({canShow: true})
        }, 3 * 1000)
    }
    
    render() {
        const timeTracker = this.props.timeTracker
        
        const onNotificationsRequested = (evt: any) => {
            evt.preventDefault()
            timeTracker.requestNotifications()
        }

        const onNotificationsDeclined = (evt: any) => {
            evt.preventDefault()
            timeTracker.declineNotifications()
        }

        const canShow = timeTracker.canRequestNotifications && this.state.canShow

        return <CSSTransition in={canShow} classNames="expand-from-top" timeout={300} unmountOnExit mountOnEnter appear={true}>
            <div className="notificationsPermissionRequest">
                Enable browser notifications so you don't miss 
                questions? {'\u00A0'}{'\u00A0'}
                <a href="" onClick={onNotificationsRequested}>Yes</a>{'\u00A0'}{'\u00A0'}{'\u00A0'}
                |
                {'\u00A0'}{'\u00A0'}{'\u00A0'}<a href="" onClick={onNotificationsDeclined}>No</a>
            </div>
        </CSSTransition>
    }
}