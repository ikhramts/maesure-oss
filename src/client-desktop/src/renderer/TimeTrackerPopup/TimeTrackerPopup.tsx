import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { TimeTrackerWidget } from 'shared/components/TimeTrackerWidget/TimeTrackerWidget';
import { remote } from 'electron'
import { SIMPLE_POPUP_WIDTH, SIMPLE_POPUP_HEIGHT, DETAILED_POPUP_WIDTH, DETAILED_POPUP_HEIGHT, CONNECTION_STATE_DIALOG_WIDTH, CONNECTION_STATE_DIALOG_HEIGHT } from 'client/Constants';
import { QuestionType } from 'shared/model/QuestionType';
import { ConnectionStateIpcRendererAdapter } from 'client/services/connection-state/ConnectionStateIpcRendererAdapter';
import { ConnectionStateDialog } from './ConnectionStateDialog';
import { ConnectionState } from 'shared/time-tracking/ConnectionState';

export interface TimeTrackerPopupProps {
    timeTracker: TimeTrackerProxy
    connectionStateAdapter: ConnectionStateIpcRendererAdapter
}

export interface TimeTrackerPopupState {
    showingConnectionDialog: boolean

    // This is for the cases when there's a connection error and the
    // user has acknowledged that they've seen it.
    // This should be reset after the connection is re-established.
    userClosedConnectionDialog: boolean
}

// This component will be persistent for the entire runtime of Maesure.
// The window will sometimes become visible or hidden, but the component
// will always be there.
// We can treat this component as a singleton with lifetime = program runtime.
export class TimeTrackerPopup extends React.Component<TimeTrackerPopupProps, TimeTrackerPopupState> {
    constructor(props: TimeTrackerPopupProps) {
        super(props)

        // Bindings
        this.showConnectionStateDialogNow = this.showConnectionStateDialogNow.bind(this)
        this.closeConnectionStateDialog = this.closeConnectionStateDialog.bind(this)

        // Configure the window for rendering popups.
        const window = remote.getCurrentWindow()
        window.hide()
        window.setAlwaysOnTop(true)
        window.setAutoHideMenuBar(true)
        window.setMenuBarVisibility(false)
        window.setMinimizable(false)
        window.setSkipTaskbar(true)

        // Wire up service connections.
        this.props.connectionStateAdapter.onCheckNow(this.showConnectionStateDialogNow)

        const apiClient = this.props.timeTracker.apiClient
        apiClient.onCreatePollResponseFailed(this.showConnectionStateDialogNow)

        // Initialize the state.
        this.state = {
            showingConnectionDialog: false,
            userClosedConnectionDialog: false
        }
    }

    componentDidUpdate(oldProps: TimeTrackerPopupProps) {
        const oldConnectionState = oldProps.timeTracker.connectionState
        const newConnectionState = this.props.timeTracker.connectionState

        if (newConnectionState == ConnectionState.Ok
            && oldConnectionState != ConnectionState.Ok) {

            // Reset to initial state.
            this.setState({userClosedConnectionDialog: false})
        }
    }

    render() {
        // Note: the bulk of this function is very non-Reactish;
        // it sets the Chromium window dimentions.

        // Figure out what we should be showing.
        const timeTracker = this.props.timeTracker
        const state = this.state
        const popup = timeTracker.showingPopup
        let showingComponent : ShowingComponent

        if (this.state.showingConnectionDialog) {
            // Connection state dialog was explicitly requested.
            // Or the user really needs to see it.
            showingComponent = ShowingComponent.ConnectionStateDialog

        } else if (timeTracker.connectionState != ConnectionState.Ok) {
            if (popup && !state.userClosedConnectionDialog) {
                // A popup should be shown now and the user doesn't
                // know that the connection is lost.
                showingComponent = ShowingComponent.ConnectionStateDialog
            
            } else {
                // Show nothing.
                // Either no popup is due or user was already a connection state dialog.
                showingComponent = ShowingComponent.Nothing
            }
        } else if (popup) {
            // We're supposed to show a popup. Figure out which one.
            if (popup.questionType == QuestionType.Detailed) {
                showingComponent = ShowingComponent.DetailedPopup
            } else {
                showingComponent = ShowingComponent.SimplePopup
            }
        } else {
            // There's nothing to be shown.
            showingComponent = ShowingComponent.Nothing
        }

        // Figure out the expected state of the window.
        const expectWindowVisible = showingComponent != ShowingComponent.Nothing
        
        let expectedWidth = 0
        let expectedHeight = 0

        if (showingComponent == ShowingComponent.SimplePopup) {
            expectedWidth = SIMPLE_POPUP_WIDTH
            expectedHeight = SIMPLE_POPUP_HEIGHT
        } else if (showingComponent == ShowingComponent.DetailedPopup) {
            expectedWidth = DETAILED_POPUP_WIDTH
            expectedHeight = DETAILED_POPUP_HEIGHT
        } else if (showingComponent == ShowingComponent.ConnectionStateDialog) {
            expectedWidth = CONNECTION_STATE_DIALOG_WIDTH
            expectedHeight = CONNECTION_STATE_DIALOG_HEIGHT
        }

        // Get the actual state of the window.
        const window = remote.getCurrentWindow()
        const windowVisible = window.isVisible()
        const windowSize = window.getSize()
        const windowWidth = windowSize[0]
        const windowHeight = windowSize[1]

        // Update the window if needed.
        if (!expectWindowVisible && windowVisible) {
            window.hide()
            //window.minimize()
        
        } else if (expectWindowVisible && 
                    (! windowVisible 
                    || expectedWidth != windowWidth
                    || expectedHeight != windowHeight)) {

            if (expectedWidth == windowWidth && expectedHeight == windowHeight) {
                // Don't need to change the window size
                // window.restore()
                window.show()
                // window.focus()

            } else {
                // Need to change the window size. Take it slower so that
                // React can catch up.
                setTimeout(() => {
                    window.setSize(expectedWidth, expectedHeight)
    
                    if (!windowVisible) {
                        // window.restore()
                        window.show()
                        // window.focus()
                        // setTimeout(() => {
                        // }, 50)
                    }
                })
            }
        }

        // Render appropriate HTML.
        if (showingComponent == ShowingComponent.ConnectionStateDialog) {
            return <div className="timeTrackerPopup">
                <ConnectionStateDialog 
                    timeTracker={this.props.timeTracker}
                    onClose={this.closeConnectionStateDialog}/>
            </div>
        
        } else {
            return <div className="timeTrackerPopup">
                <TimeTrackerWidget timeTracker={this.props.timeTracker}/>
            </div>
        }
    }

    // ================== Private ===================
    private showConnectionStateDialogNow() : Promise<void> {
        this.setState({
            showingConnectionDialog: true,
            userClosedConnectionDialog: false
        })

        return Promise.resolve()
    }

    private closeConnectionStateDialog() {
        const connectionState = this.props.timeTracker.connectionState

        this.setState({
            showingConnectionDialog: false,

            // If this is set to 'true', the time tracker dialog will not
            // open again.
            // This should be reset to 'false' after a successful
            // reconnection.
            userClosedConnectionDialog: connectionState != ConnectionState.Ok
        })
    }
}

enum ShowingComponent {
    Nothing = "Nothing", 
    SimplePopup = "SimplePopup", 
    DetailedPopup = "DetailedPopup", 
    ConnectionStateDialog = "ConnectionStateDialog"
}