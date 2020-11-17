import 'antd/dist/antd.css'
import './styles/renderer.styl';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as log from 'electron-log'
import { ApiClient } from 'shared/api/ApiClient'
import { RendererProcessCredentialsProvider } from 'client/services/api/RendererProcessCredentialsProvider';
import { TimeService } from 'shared/utils/time/TimeService'
import { AuthenticationProxy } from 'client/services/auth/AuthenticationProxy';
import { withTimeTracker, TimeTrackerContext } from 'shared/time-tracking/TimeTrackerService'
import { HashRouter, Route, Switch } from 'react-router-dom';
import { GettingStarted } from './GettingStarted/GettingStarted';
import { TimeTrackerIpcRendererAdapter } from 'client/services/time-tracker-controls/TimeTrackerIpcRendererAdapter';
import { TimeTrackerEnvironment } from 'shared/time-tracking/TimeTrackerEnvironment';
import { TimerFactory } from 'client/../../shared/utils/time/TimerFactory';
import { ConnectionMonitor } from 'client/../../shared/time-tracking/ConnectionMonitor';
import { ConnectionStateIpcRendererAdapter } from 'client/services/connection-state/ConnectionStateIpcRendererAdapter';
import { TimeTrackerPopup } from './TimeTrackerPopup/TimeTrackerPopup';

// Initialize services required for TimeTrackerService
console.log = log.info

const environment = TimeTrackerEnvironment.DESKTOP
const timeService = new TimeService()
const timerFactory = new TimerFactory()
const authProxy = new AuthenticationProxy(timeService)
const credentialsProvider = new RendererProcessCredentialsProvider(authProxy)
const apiClient = new ApiClient("https://maesure.com", credentialsProvider, environment)
const connectionMonitor = new ConnectionMonitor(apiClient, timeService, timerFactory)

const context = {
    timeService: timeService,
    timerFactory: timerFactory,
    apiClient: apiClient,
    environment: environment,
    connectionMonitor: connectionMonitor
} as TimeTrackerContext

// Initialize other services
const connectionStateIpcRendererAdapter = new ConnectionStateIpcRendererAdapter(connectionMonitor)
connectionStateIpcRendererAdapter.shutUpAboutDeclaredButValueNeverRead()

// Render!
ReactDOM.render(
    withTimeTracker(context, (timeTracker) => {
        return <div className="content">
            <TimeTrackerIpcRendererAdapter timeTracker={timeTracker}/>
            <HashRouter hashType='slash'>
                <Switch>
                    <Route exact path='/time-tracker-popup' 
                        render={() => <TimeTrackerPopup timeTracker={timeTracker} 
                                            connectionStateAdapter={connectionStateIpcRendererAdapter}/>} />
                    <Route exact path='/getting-started' 
                        render={() => <GettingStarted timeTracker={timeTracker} />} />
                </Switch>
            </HashRouter>
            
        </div>
    }),
    document.getElementById('root')
);
