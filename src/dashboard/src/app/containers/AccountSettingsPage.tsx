import * as React from 'react';
import { DeleteAccount } from './settings/DeleteAccount';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { ChangePassword } from './settings/ChangePassword';
import { SubscriptionSettings } from './settings/SubscriptionSettings';

export interface AccountSettingsProps {
    timeTracker: TimeTrackerProxy
}

export function AccountSettingsPage(props: AccountSettingsProps) {
    return <div className="page accountSettings">
        <h1>Account settings</h1>
        <h2>Change password</h2>
        <ChangePassword timeTracker={props.timeTracker}/>
        <h2 className="withTopDivider">Subscription</h2>
        <SubscriptionSettings timeTracker={props.timeTracker}/>
        <h2 className="withTopDivider">Danger zone</h2>
        <DeleteAccount timeTracker={props.timeTracker}/>   
    </div>
}

