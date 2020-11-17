import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { AccountType } from 'shared/model/AccountType';
import { Button, Icon } from 'antd';
import { Link } from 'react-router-dom';
import { PaddleCheckout, CheckoutAction } from '../PaddleCheckout';

export interface SubscriptionSettingsProps {
    timeTracker: TimeTrackerProxy
}

export interface SubscriptionSettingsState {
    showCheckout: boolean
    checkoutComplete: boolean
    cancelPanelOpen: boolean
    cancellingSubscription: boolean
    cancelledSubscription: boolean
}

export class SubscriptionSettings
extends React.Component<SubscriptionSettingsProps, SubscriptionSettingsState> {
    constructor(props: SubscriptionSettingsProps) {
        super(props)

        this.onClickUpdatePayment = this.onClickUpdatePayment.bind(this)
        this.onCheckoutComplete = this.onCheckoutComplete.bind(this)
        this.subscriptionNotice = this.subscriptionNotice.bind(this)
        this.onClickCancelSubscription = this.onClickCancelSubscription.bind(this)

        this.state = {
            showCheckout: false,
            checkoutComplete: false,
            cancelPanelOpen: false,
            cancellingSubscription: false,
            cancelledSubscription: false,
        }
    }

    render() {
        const timeTracker = this.props.timeTracker
        const user = timeTracker.user

        if (!user) {
            return <div></div>
        }

        if (user.accountType == AccountType.FREE_PERMANENT) {
            return <div className="subscriptionSettings">
                <p>
                    Your account is free forever. You have all features of Maesure Pro.
                </p>
            </div>
        }

        if (user.accountType == AccountType.PRO_TRIAL 
            || user.accountType == AccountType.PRO_TRIAL_EXPIRED) {
                
            let sbscriptionEndTime : JSX.Element

            if (user.remainingTrialDays > 1) {
                sbscriptionEndTime = <p>Your Maesure trial ends in {user.remainingTrialDays} days.</p>
            } else if (user.remainingTrialDays == 1) {
                sbscriptionEndTime = <p>This is the last day of your Maesure trial.</p>
            } else {
                sbscriptionEndTime = <p>Your trial has ended.</p>
            }

            return <div className="subscriptionSettings">
                { this.subscriptionNotice() }
                { sbscriptionEndTime }
                <p>
                    <Link className="ant-btn ant-btn-primary" to="/enter-payment">
                        <span>Add payment method</span>
                    </Link>
                </p>
            </div>
        }

        let displayedElement : JSX.Element | null = null

        if (this.state.showCheckout) {
            displayedElement = <PaddleCheckout timeTracker={timeTracker}
                                             action={CheckoutAction.UPDATE_PAYMENT}
                                             onCheckoutComplete={this.onCheckoutComplete}/>
        } else {
            displayedElement = <p>
                <Button type="primary" className="updatePaymentDetails"
                        onClick={this.onClickUpdatePayment}>
                    Update payment details
                </Button>
                <Button type="danger" onClick={this.onClickCancelSubscription}>
                    Cancel subscription
                </Button>
            </p>
        }

        if (user.accountType == AccountType.PRO) {
            return <div className="subscriptionSettings">
                { this.subscriptionNotice() }
                <p>
                    You are subscribed to Maesure Pro.
                </p>
                
                { displayedElement }
                { this.cancelPanel() }
            </div>
        }

        return <div>Something went wrong.</div>
    }

    // =================== Private =======================
    private onClickUpdatePayment(evt:any) {
        this.setState({showCheckout: true})
    }

    private onCheckoutComplete() {
        // Hm. Nothing to do?
    }

    private subscriptionNotice() : JSX.Element | null {
        const state = this.state

        if (state.cancellingSubscription) {
            return <p className="subscriptionNotice">
                <Icon className="primary margin-right-sm" type="loading"/>Cancelling your subscription...
            </p>
        }

        if (state.cancelledSubscription) {
            return <p className="subscriptionNotice">
                <Icon className="green margin-right-sm" type="check"/>Subscription cancelled.
            </p>
        }

        return null
    }

    private onClickCancelSubscription() {
        this.setState({cancelPanelOpen: true})
    }

    private cancelPanel() : JSX.Element | null {
        if (!this.state.cancelPanelOpen) {
            return null
        }

        const onClickNo = () => {
            this.setState({cancelPanelOpen: false})
        }

        const onClickYes = () => {
            this.setState({cancellingSubscription: true}, () => {
                this.props.timeTracker.apiClient.cancelSubscription()
                    .then(() => {
                        this.setState({
                            cancelPanelOpen: false,
                            cancellingSubscription: false,
                            cancelledSubscription: true
                        })
                    })
            })
        }

        return <div className="dangerContainer cancelSubscriptionForm">
            <p>
                Your account will be downgraded on your next scheduled payment date.
            </p>
            <p>
                <Button id="cancelSubscription_confirmButton" type="danger" onClick={onClickYes}>Yes, cancel subscription</Button>
                <Button id="cancelSubscription_cancelButton" type="default" onClick={onClickNo}>No, keep the subscription</Button>
            </p>
        </div>
    }
}