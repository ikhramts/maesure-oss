import * as React from 'react'

import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { AccountType } from 'shared/model/AccountType';
import { NavLink, Link } from 'react-router-dom';
import { Icon } from 'antd';
import { PaddleCheckout, CheckoutAction } from './PaddleCheckout';
import { PRO_PRICE } from 'shared/model/Subscriptions';

export interface EnterPaymentPageProps {
    timeTracker: TimeTrackerProxy
}

export interface EnterPaymentPageState {
    checkingForOrderCompletion: boolean,
    paymentSuccess: boolean,
    paymentError: boolean
}

export class EnterPaymentPage 
extends React.Component<EnterPaymentPageProps, EnterPaymentPageState> {
    constructor(props: EnterPaymentPageProps) {
        super(props)

        this.canUserSubscribe = this.canUserSubscribe.bind(this)
        this.onCheckoutComplete = this.onCheckoutComplete.bind(this)
        this.pollForPaidStatus = this.pollForPaidStatus.bind(this)

        this.state = {
            checkingForOrderCompletion: false,
            paymentSuccess: false,
            paymentError: false,
        }
    }

    componentWillUnmount() {
        this._unmounted = true
    }
    
    render() {
        const state = this.state
        const timeTracker = this.props.timeTracker
        const user = timeTracker.user

        if (!user) {
            return <div className="enterPaymentPage">
                <div className="notice">
                    <Icon type="loading"/> Hang on...
                </div>
            </div>
        }

        if (state.checkingForOrderCompletion) {
            return <div className="enterPaymentPage">
                <div className="notice">
                    <Icon type="loading"/>This may take a minute or two, don't go anywhere...
                </div>
            </div>
        }

        if (user.accountType == AccountType.PRO) {
            return <div className="enterPaymentPage">
                <div className="notice">
                    Not sure how you got here, but you are already subscribed to Maesure Pro. 
                    <br/>
                    <br/>
                    You can update your payment method on 
                    the <NavLink to="/account-settings">account page</NavLink>.
                </div>
            </div>
        }

        if (!this.canUserSubscribe()) {
            return <div className="enterPaymentPage">
                <div className="notice">
                    Not sure how you got here, but first you need
                    to <Link to="/create-account">create account</Link> or <a href="http://localhost:5000/api/auth/login">sign in</a>.
                </div>
            </div>
        }

        if (state.paymentError) {
            return <div className="enterPaymentPage">
                <div className="notice">
                    <p>
                        Something went wrong. Your payment probably completed 
                        successfully, but we couldn't finish the setup.
                    </p>
                    <p>
                        Keep using Maesure. If it still looks like you're not
                        on Maesure Pro plan, <Link to="/contact">contact us</Link> for help.
                    </p>
                    <p>
                        <a href="/">Back to Maesure</a>
                    </p>
                </div>
            </div>
        }

        if (state.paymentSuccess) {
            return <div className="enterPaymentPage">
                <div className="notice">
                    <Icon type="check"/> All set! Your are now on Maesure Pro.
                    <br/>
                    Your recept was emailed to you.
                    <br/>
                    <br/>
                    <a href="/">Back to Maesure</a>
                </div>
            </div>
        }

        let firstChargeTime : JSX.Element 
        const remainingTrialDays = user.remainingTrialDays
        if (remainingTrialDays > 1) {
            firstChargeTime = <p className="when">Your first payment will be in {remainingTrialDays} days.</p>
        
        } else if (remainingTrialDays == 1) {
            firstChargeTime = <p className="when">Your first payment will be tomorrow.</p>
        
        } else {
            firstChargeTime = <p className="when">Your payments will start immediately.</p>
        }

        return <div className="enterPaymentPage">
            <div className="enterPayment">
                <h1>Maesure Pro</h1>
                <p className="cost">US$ {PRO_PRICE}/month</p>
                { firstChargeTime }
                <PaddleCheckout timeTracker={timeTracker}
                                action={CheckoutAction.BUY_PRO}
                                onCheckoutComplete={this.onCheckoutComplete}/>
            </div>

        </div>
    }

    //======================== Private ======================
    private _unmounted = false

    private canUserSubscribe() : boolean {
        const timeTracker = this.props.timeTracker
        const user = timeTracker.user

        return !!user 
                && user.accountType != AccountType.NONE 
                && user.accountType != AccountType.TEMPORARY
                && user.accountType != AccountType.PRO
    }

    private onCheckoutComplete() {
        this.setState({checkingForOrderCompletion: true}, this.pollForPaidStatus)
    }

    private pollForPaidStatus() {
        if (this._unmounted) {
            return
        }

        const apiClient = this.props.timeTracker.apiClient

        apiClient.fetchCurrentUser()
            .catch(() => {
                this.setState({
                    checkingForOrderCompletion: false,
                    paymentError: true
                })
            })
            .then((user) => {
                if (user && user.accountType == AccountType.PRO) {
                    this.setState({
                        checkingForOrderCompletion: false,
                        paymentSuccess: true
                    })
                } else {
                    setTimeout(this.pollForPaidStatus, 100)
                }
            })
    }
}