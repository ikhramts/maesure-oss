import * as React from 'react'
import { Link } from 'react-router-dom';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { HeaderNavBar } from './HeaderNavBar';

export interface MainLayoutProps {
    timeTracker: TimeTrackerProxy
}

export class MainLayout extends React.Component<MainLayoutProps, {}> {
    render() {
        return <div className="everything">
            <p className="shuttingDownBanner">
                Maesure is shutting down on December 4. <Link to="/shutting-down">Read more</Link>
            </p>
            <div className="headerWrap">
                <div className="header">
                    <div className="headerTitle">
                        <h1>
                            <Link className="logo" to="/">
                                <img className="logoImg" src="/logo.png" alt="Maesure logo"/>
                            </Link> 
                        </h1>
                    </div>
                    <div className="headerNav">
                        <HeaderNavBar timeTracker={this.props.timeTracker} />
                    </div>
                </div>
            </div>
            <div className="pageWrap">
                { this.props.children }
            </div>
            <div className="footer">
                Copyright 2019 Ordered Logic Inc. By using this site you agree to the <Link to="/terms-and-conditions">
                Terms and Conditions</Link> and the <Link to="/privacy-policy">Privacy Policy</Link>.
            </div>
        </div>

    }
}