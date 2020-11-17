import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { AccountProvider } from 'shared/model/AccountProvider';
import { Button, Icon } from 'antd';

export interface ChangePasswordProps {
    timeTracker: TimeTrackerProxy
}

export interface ChangePasswordState {
    submissionState: ChangePasswordSubmissionState
}

export enum ChangePasswordSubmissionState {
    NOT_STARTED = "NOT_STARTED", 
    SUBMITTING = "SUBMITTING", 
    SUCCEEDED = "SUCCEEDED", 
    FAILED = "FAILED"
}

export class ChangePassword 
extends React.Component<ChangePasswordProps, ChangePasswordState> {
    constructor(props: ChangePasswordProps) {
        super(props)

        this.onPasswordResetClicked = this.onPasswordResetClicked.bind(this)

        this.state = {
            submissionState: ChangePasswordSubmissionState.NOT_STARTED
        }
    }

    render() {
        const timeTracker = this.props.timeTracker
        const user = timeTracker.user

        if (!user || user.accountProvider == AccountProvider.NONE) {
            return <div className="changePassword">
                <p>We could not load your account properly.</p>
            </div>
        }

        if (user.accountProvider == AccountProvider.GOOGLE) {
            return <div className="changePassword">
                <p>
                    You are using a Google account. You can change your password 
                    on <a href="https://myaccount.google.com/">Google account management</a> page.
                </p>
            </div>
        }

        if (user.accountProvider == AccountProvider.USERNAME_PASSWORD) {
            let actionArea : JSX.Element
            const submissionState = this.state.submissionState

            if (submissionState == ChangePasswordSubmissionState.NOT_STARTED) {
                actionArea = <p>
                    <Button onClick={this.onPasswordResetClicked}>
                        Request password reset
                    </Button>
                </p>
            } else if (submissionState == ChangePasswordSubmissionState.SUBMITTING) {
                actionArea = <p>
                    <Icon type="loading" /> Submitting request...
                </p>
            } else if (submissionState == ChangePasswordSubmissionState.FAILED) {
                actionArea = <p className="error">
                    Something went wrong. Please try again later.
                </p>
            } else if (submissionState == ChangePasswordSubmissionState.SUCCEEDED) {
                actionArea = <p className="success">
                    <Icon type="check"/> You should receive an email with instructions shortly.
                </p>
            } else {
                // This is a weird case.
                actionArea = <p className="error">
                    Unexpected state: {submissionState}
                </p>
            }

            return <div className="changePassword">
                <p>
                    You can request an email with password reset instructions.
                </p>
                { actionArea }
            </div>
        }

        return <div className="changePassword">
            <p>We could not load your account properly.</p>
        </div>
    }

    // ================= Private =====================
    private onPasswordResetClicked(evt: any) {
        evt.preventDefault()

        const email = this.props.timeTracker.user!!.email;
        const url = "/api/account/send-change-password-email/" + email;

        this.setState({submissionState: ChangePasswordSubmissionState.SUBMITTING})

        fetch(url, {method: 'POST'})
            .catch((err) => {
                this.setState({submissionState: ChangePasswordSubmissionState.FAILED})
            })
            .then(() => {
                this.setState({submissionState: ChangePasswordSubmissionState.SUCCEEDED})
            })
        
        return false
    }
}