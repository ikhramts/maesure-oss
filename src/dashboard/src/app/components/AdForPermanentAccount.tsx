import * as React from 'react'
import { Link } from 'react-router-dom';
import { Icon } from 'antd';
import { PRO_PRICE, PRO_TRIAL_DAYS } from 'shared/model/Subscriptions'

export interface AdForPermanentAccountState {
    canShow: boolean
}

export class AdForPermanentAccount extends React.Component<{}, AdForPermanentAccountState> {
    constructor(props: {}) {
        super(props)

        this.state = {
            canShow: false
        }
    }

    componentDidMount() {
        setTimeout(() => {this.setState({canShow: true})}, 10 * 1000)
    }

    render() {
        return <div className="adForPermanentAccount">
            <div className="adBlock">
                <h2>You're trying out Maesure</h2>
                <ul className="drawbacksList">
                    <li><Icon type="minus" /> Only two days of data</li>
                    <li><Icon type="minus" /> Accessible only in this browser</li>
                    <li><Icon type="minus" /> Session expires if not used for a while</li>
                </ul>
            </div>
            <div className="adBlock">
                <h2>If you <Link to="/create-account">create account</Link> ...</h2>
                <ul className="benefitsList">
                    <li><Icon type="check" /> Desktop app (Windows)</li>
                    <li><Icon type="check" /> Use multiple devices</li>
                    <li><Icon type="check" /> Unlimited data</li>
                    <li><Icon type="check" /> Doesn't expire</li>
                    <li><Icon type="check" /> {PRO_TRIAL_DAYS} day trial <Icon type="arrow-right"/> ${PRO_PRICE}/month</li>
                </ul>

                <Link to="/create-account" className="createAccountAdLInk">Create account</Link>
            </div>
        </div>
    }
    
}