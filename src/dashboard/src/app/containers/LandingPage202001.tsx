import * as React from 'react'
import { Icon, Button } from 'antd';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { useHistory } from 'react-router-dom'

export interface LandingPage202001Props {
    timeTracker: TimeTrackerProxy
}

export function LandingPage202001(props: LandingPage202001Props) {

    const onClickTryIt = (evt: any) => {
        evt.preventDefault()
        window.scrollTo({top: 0})
        setTimeout(() => {
            props.timeTracker.startPoll()
        }, 200)
    }

    const history = useHistory()
    const navigateToContact = () => {
        history.push('/contact')
    }

    return <div className="landingPage202001">
        <div className="landingMain">
            <div className="tryIt">
                <Icon type="arrow-up" /><br/> 
                Give it a try<br/> No signup needed
            </div>
            <div className="landingTitle">
                <h1>A simpler time tracker</h1>
            </div>
            <div className="landingSubtitle">
                <h2>
                    That asks what you're doing every&nbsp;
                    <span className="configurable">15 minutes
                        <div className="configurableArrowAndText">
                            <Icon type="arrow-up" /><br/>configurable
                        </div>
                    </span>
                </h2>
            </div>
            <div className="heroImage">
                <img src="/star_wars_tasks_screenshot.png" alt="Maesure screenshot"/>
            </div>
        </div>
        <div className="supportingBenefits">
            <h1>Focus on your work</h1>
            <h2>Not on tracking your tasks</h2>
            <div className="supportingBenefitsList">
                <div className="benefit">
                    <h3>Desktop app</h3>
                    <p>For Windows. (Coming soon: Mac)</p>
                    <div className="benefitImage">
                        <img src="/system-tray-screenshot-2.png" alt="desktop-app-screenshot"/>
                    </div>
                </div>
                <div className="benefit">
                    <h3>Own your data</h3>
                    <p>Export full history as CSV</p>
                    <div className="benefitImage">
                        <img src="/csv-screenshot.png" alt="history--csv-screenshot"/>
                    </div>
                </div>
            </div>
            <div className="supportingBenefitsList">
                <div className="benefit wideBenefit">
                    <h3>Full controll</h3>
                    <p>Organize and manage your task history as you want it</p>
                    <div className="benefitImage">
                        <img src="/history-screenshot.png" alt="history-screenshot"/>
                    </div>
                </div>
            </div>
        </div>
        <a id="pricing"></a>
        <div className="pricingSection">
            <h1>Pricing</h1>

            <div className="pricingBlocks">
                <div className="pricingBlock">
                    <h3>For yourself</h3>

                    <p className="price">Free</p>
                    <p className="planDescription">While Maesure is in beta</p>
                    <p className="planDescription">Includes everything</p>
                    <div className="callToActionContainer">
                        <Button onClick={onClickTryIt} type="default" className="callToAction">Try it</Button>
                    </div>
                </div>
                <div className="pricingBlock">
                    <h3>For your team</h3>
                    <p className="workInProgress">Work in progress</p>
                    <div className="callToActionContainer">
                        <Button onClick={navigateToContact} type="default" className="callToAction">
                            Get in touch
                        </Button>
                    </div>
                </div>
            </div>
        </div>
        {/* <div className="whosBehindMaesure">
            <h3>Who's behind Maesure</h3>
            <p>
                Maesure is a project of <a href="https://i-kh.net">
                Iouri Khramtsov</a> (me!), a software developer/team lead/architect
                from Toronto, Canada. I am the owner, founder, engineer, and the support
                person for Maesure.
            </p>
            <p>
                Over the years I've tried different ways to track time, 
                and came to conclusion that I needed to rethink the approach.
                The result was Maesure.
            </p>
            <p className="myPhoto">
                <img src="/me-on-seymour.jpg" alt="Photo of Iouri"/>
            </p>
        </div> */}
    </div>
}