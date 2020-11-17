import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { TimeTrackerWidget } from 'shared/components/TimeTrackerWidget/TimeTrackerWidget';
import { AccountType } from 'shared/model/AccountType';
import { TimeTrackerResults } from 'app/components/TimeTrackerResults/TimeTrackerResults';
import { CSSTransition } from 'react-transition-group';
import { LandingPage202001 } from './LandingPage202001';
import { Switch, Route } from 'react-router';
import { LandingPageTrackingClients } from './LandingPageTrackingClients';

export interface LandingPage2Props {
    timeTracker: TimeTrackerProxy
}

export interface LandingPage2State {
    landingBenefitsLeft: boolean
}

export class LandingPage2 extends React.Component<LandingPage2Props, LandingPage2State> {
    constructor(props: LandingPage2Props) {
        super(props)

        this.state = {
            landingBenefitsLeft: !hasLandingBenefits(props)
        }
    }

    componentDidUpdate() {
        const showLandingBenefits = hasLandingBenefits(this.props)

        if (showLandingBenefits && this.state.landingBenefitsLeft) {
            this.setState({landingBenefitsLeft: false})
        }
    }

    render() {
        const timeTracker = this.props.timeTracker;
        const showLandingBenefits = hasLandingBenefits(this.props)

        const isLoading = timeTracker.isLoading
        const showResults = !isLoading && !showLandingBenefits && this.state.landingBenefitsLeft

        return <div className="page landingPage"> 
            <div className="pageSegment">
                <TimeTrackerWidget timeTracker={this.props.timeTracker} />
            </div>

            <CSSTransition timeout={{enter: 500, appear: 500, exit: 500}} classNames="fade" in={showLandingBenefits} unmountOnExit mountOnEnter appear={true}
                            onExited={() => this.setState({landingBenefitsLeft:true})}>
                <Switch>
                    <Route exact path="/" render={(routeProps) => <LandingPage202001 timeTracker={timeTracker} />} />
                    <Route exact path="/track-clients" render={(routeProps) => <LandingPageTrackingClients timeTracker={timeTracker} />} />
                </Switch>
            </CSSTransition>
            <div className="pageSegment">
                <CSSTransition timeout={{enter: 500, appear: 500, exit: 500}} classNames="fade" in={showResults} unmountOnExit mountOnEnter appear={true}>
                    <TimeTrackerResults timeTracker={timeTracker} />
                </CSSTransition>
            </div>            
        </div>
    }

    // ================ Private ==================
    landingBenefitsLeft() {

    }
}

function hasLandingBenefits(props: LandingPage2Props) {
    const timeTracker = props.timeTracker;
    const accountType = timeTracker.user ? timeTracker.user.accountType : AccountType.NONE
    const processingFirstResponse = timeTracker.processingFirstResponse


    const isLoading = timeTracker.isLoading
    const showLandingBenefits = !isLoading && (accountType == AccountType.NONE || processingFirstResponse)

    return showLandingBenefits
}
