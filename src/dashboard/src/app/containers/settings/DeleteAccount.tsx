import * as React from 'react'
import { Button, Input } from 'antd';

import './DeleteAccount.styl'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';

export interface DeleteAccountState {
    dialogOpened: boolean,
    confirmDeleteText?: string
}

export interface DeleteAccountProps {
    timeTracker: TimeTrackerProxy
}

export class DeleteAccount extends React.Component<DeleteAccountProps, DeleteAccountState> {
    constructor(props: DeleteAccountProps) {
        super(props)

        this.state = {
            dialogOpened: false
        }
    }

    render() {
        return <p>
            { this.state.dialogOpened ? this.renderDelteDialog() : this.renderInitialButton() }
        </p>
    }

    private renderInitialButton() {
        let onClickOpenDialog = (evt:any) => {
            evt.preventDefault()
            this.setState({dialogOpened: true})
        }

        return <Button id="deleteAccount_startButton" type="danger" onClick={onClickOpenDialog}>Delete account</Button>
    }

    private renderDelteDialog() {
        let onClickCancel = (evt:any) => {
            evt.preventDefault()
            this.setState({dialogOpened: false})
        }

        let onClickDelete = (evt:any) => {
            evt.preventDefault()

            const apiClient = this.props.timeTracker.apiClient
            apiClient.sendPost("/api/account/delete")
                .then(() => {
                    // Goodbye.
                    window.location.replace("/api/auth/logout")
                })
        }

        let onConfirmDeleteTextChanged = (evt:any) => {
            this.setState({confirmDeleteText: evt.target.value})
        }

        return <div className="dangerContainer deleteAccountForm">
            <p>
                <strong>Warning:</strong> this cannot be undone. After deleting the account, 
                you will no longer be able to access your data. We will not be able to undo it.
            </p>
            <p>To confirm that you want to delete the account, enter the word "<strong>delete</strong>" below.</p>
            <p>
                <Input id="deleteAccount_confirmInput" value={this.state.confirmDeleteText} onChange={onConfirmDeleteTextChanged}/>
            </p>
            <p>
                <Button id="deleteAccount_confirmButton" type="danger" onClick={onClickDelete} disabled={ this.state.confirmDeleteText != "delete" } >Delete account</Button>
                <Button id="deleteAccount_cancelButton" type="default" onClick={onClickCancel}>Cancel</Button>
            </p>
        </div>
    }
}