import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { NavLink, Route, Switch, Redirect } from 'react-router-dom';
import { AccountType } from 'shared/model/AccountType';
import { AdForPermanentAccount } from '../AdForPermanentAccount';
import { NotificationsPermissionRequest } from '../NotificationsPermissionRequest';
import { SummaryPage } from './SummaryPage';
import { HistoryPage } from './HistoryPage';

export interface TimeTrackerResultsProps {
    timeTracker: TimeTrackerProxy
}

export class TimeTrackerResults extends React.Component<TimeTrackerResultsProps, {}> {
    render() {
        const timeTracker = this.props.timeTracker

        let adForPermanentAccount : JSX.Element | null = null

        if (timeTracker.user && timeTracker.user.accountType == AccountType.TEMPORARY) {
            adForPermanentAccount = <AdForPermanentAccount/>
        }

        return <div className="timeTrackerResults">
            <NotificationsPermissionRequest timeTracker={timeTracker} />
            <div className="mobileWarning">
                Heads up: Maesure is optimized for desktop use.
            </div>
            <h2 className="resultsHeaderNav">
                <NavLink to="/" exact id="timeTrackerResults_reportsNavLink">View results</NavLink> <span className="inlineDivider">|</span> <NavLink to="/history"  id="timeTrackerResults_editEntriesNavLink">Edit entries</NavLink>
            </h2>
            <Switch>
                <Route exact path="/" render={(routeProps) => <SummaryPage timeTracker={timeTracker} />} />
                <Route exact path="/history" render={(routeProps) => <HistoryPage timeTracker={timeTracker} />} />
                <Redirect path="/track-clients" to="/"/>
            </Switch>

            { adForPermanentAccount }

        </div>
    }
}