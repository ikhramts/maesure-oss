import * as React from 'react';
import { Route, Switch } from 'react-router';
import * as Pages from 'app/containers';
import { hot } from 'react-hot-loader';
import { withTimeTracker, TimeTrackerContext } from 'shared/time-tracking/TimeTrackerService';
import { MainLayout } from './components/layout/MainLayout';
import { TimeService } from 'shared/utils/time/TimeService';
import { CookieCredentialsProvider } from 'shared/api/CookieCredentialsProvider'
import { ApiClient } from 'shared/api/ApiClient';
import { TimeTrackerEnvironment } from 'shared/time-tracking/TimeTrackerEnvironment';
import { ConnectionMonitor } from 'shared/time-tracking/ConnectionMonitor';
import { TimerFactory } from 'shared/utils/time/TimerFactory';

// Initialize timeService, apiClient
const environment = TimeTrackerEnvironment.WEB
const timeService = new TimeService()
const timerFactory = new TimerFactory()
const credentialsProvider = new CookieCredentialsProvider()
const apiClient = new ApiClient('', credentialsProvider, environment)
const connectionMonitor = new ConnectionMonitor(apiClient, timeService, timerFactory)

const context = {
  timeService: timeService,
  timerFactory: timerFactory,
  apiClient: apiClient,
  environment: environment,
  connectionMonitor: connectionMonitor
} as TimeTrackerContext

export const App = hot(module)(() => (
  withTimeTracker(context, timeTracker => 
      // Replace 'withTimeTracker' by the actual timeTrackerService
      <Switch>
        <Route exact path="/create-account" component={Pages.CreateAccountPage} />
        {/* <Route exact path="/enter-payment" render={(routeProps) => <Pages.EnterPaymentPage timeTracker={timeTracker} />}  /> */}
        <Route path="/">
          <MainLayout timeTracker={timeTracker}>
            <Switch>
              <Route exact path={["/", "/history", "/track-clients"]} render={(routeProps) => <Pages.LandingPage2 timeTracker={timeTracker} />} />
              <Route exact path="/account-settings" render={(routeProps) => <Pages.AccountSettingsPage timeTracker={timeTracker} />} />
              <Route exact path="/contact" component={Pages.ContactPage} />} />
              <Route exact path="/apps" component={Pages.AppsPage} />} />
              <Route exact path="/landing-new" render={(routeProps) => <Pages.LandingPage2 timeTracker={timeTracker} />} />
              <Route exact path="/privacy-policy" component={Pages.PrivacyPolicyPage} />} />
              <Route exact path="/reset-password" component={Pages.ResetPasswordPage} />} />
              <Route exact path="/terms-and-conditions" component={Pages.TermsAndConditionsPage} />
              <Route exact path="/shutting-down" component={Pages.ShuttingDownPage} />
            </Switch>
          </MainLayout>
        </Route>
      </Switch>
  )
));