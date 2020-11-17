import * as React from 'react'
import { makeSpacers } from './utils';
import { TotalsForActivity } from 'shared/model';
import { ActivityGroupCreateRequest } from 'shared/api/ActivityGroupCreateRequest';
import { SummaryTableRowActions } from './RowProps';
import { SummaryTableViewState } from '.';
import { Input, Button } from 'antd';

export interface CreateChildActivityInputProps {
    activitySummary?: TotalsForActivity
    viewState: SummaryTableViewState
    rowActions: SummaryTableRowActions
    depth: number
}

export interface CreateChildActivityInputState {
    name?: string
    nameIsValid: boolean
}

export class CreateChildActivityInput extends React.Component<CreateChildActivityInputProps, CreateChildActivityInputState> {
    constructor(props: CreateChildActivityInputProps) {
        super(props)
        this.updateName = this.updateName.bind(this)

        this.state = {
            name: undefined,
            nameIsValid: false
        }
    }

    componentDidMount() {
        if (this._inputComponent) {
            this._inputComponent.focus()
        }
    }
    
    render() {
        let parent = this.props.activitySummary
        let rowActions = this.props.rowActions

        let onClickClose = (e:any) => {
            e.preventDefault()
            rowActions.hideCreateActivityGroupInput(parent)
        }

        let onClickCreate = (e: any) => {
            e.preventDefault()

            // Prevent invalid submissions.
            if (!this.state.name || this.state.name.length == 0)
                return

            // Compose and send the request.
            let request = {name: this.state.name} as ActivityGroupCreateRequest
            
            if (parent) {
                if (parent.activityGroupId) {
                    request.parentId = parent.activityGroupId
                } else {
                    request.parentMatchResponseText = parent.name
                    request.grandparentId = parent.parentId
                }
            }

            rowActions.createActivityGroup(request, parent)
        }

        let rowViewState = this.props.viewState.getRowViewState(parent)

        return <tr>
            <td className="activityName newActivityGroupInput" colSpan={3}>
                { makeSpacers(this.props.depth) }
                <div className="expandToggle"></div>
                <div className="cellContents">
                    <form onSubmit={ onClickCreate } className="newActivityGroupInputForm">
                        <Input type="text" value={this.state.name} onChange={this.updateName} placeholder="New folder"
                                disabled={rowViewState.submittingChild} ref={(input) => this._inputComponent = input}/>
                        <br/>
                        <Button type="primary" onClick={ onClickCreate } disabled={rowViewState.submittingChild || !this.state.nameIsValid}>Add</Button>
                        <Button type="default" onClick={ onClickClose } disabled={rowViewState.submittingChild}>Cancel</Button>
                    </form>
                </div>
            </td>
        </tr>
    }

    // ================== Private =======================
    private _inputComponent : Input | null = null

    private updateName(evt: any) {
        let name = evt.target.value
        let nameIsValid = name && (name.length > 0)

        this.setState({...this.state, 
                        name: name, 
                        nameIsValid: nameIsValid
        })
    }

}