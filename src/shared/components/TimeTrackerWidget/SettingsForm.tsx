import * as React from 'react'
import { TimeTrackerWidgetProps } from './TimeTrackerWidgetProps';
import { InputNumber, Button, Icon } from 'antd';

export interface SettingsFormState {
    newDesiredFrequencyMin: number
    canSubmit: boolean
    isSubmitting: boolean
}

export class SettingsForm extends React.Component<TimeTrackerWidgetProps, SettingsFormState> {
    constructor(props: TimeTrackerWidgetProps) {
        super(props)

        this.onDesiredFrequencyMinChanged = this.onDesiredFrequencyMinChanged.bind(this)
        this.onReset = this.onReset.bind(this)
        this.onSubmit = this.onSubmit.bind(this)

        const poll = props.timeTracker.poll;

        this.state = {
            newDesiredFrequencyMin: poll ? poll.getDesiredFrequencyMin() : 0,
            canSubmit: false,
            isSubmitting: false
        }
    }

    render() {
        return <form id="timeTrackerWidget_settingsForm" className="settingsForm" onSubmit={this.onSubmit}>
            <div className="formRow">
            <label>Popup frequency (minutes)</label>
            <InputNumber id="timeTrackerWidget_settingsForm_desiredFrequency"
                value={this.state.newDesiredFrequencyMin} 
                min={1} max={300}
                onChange={this.onDesiredFrequencyMinChanged}/>
            </div>
            <div className="submitRow">
                <Button id="timeTrackerWidget_settingsForm_save" className="medium" 
                        type="primary" 
                        disabled={!this.state.canSubmit || this.state.isSubmitting} 
                        onClick={this.onSubmit}>
                    { this.state.isSubmitting ? <Icon type="sync" spin={true}/>  : "Save" }
                </Button>
                <Button id="timeTrackerWidget_settingsForm_reset" className="medium" type="default" onClick={this.onReset}>Reset</Button>
            </div>
        </form>
    }

    // ======================== Private ===========================
    private onDesiredFrequencyMinChanged(value?: number) {
        if (!value) return

        const canSubmit = value != 0 && value != this.state.newDesiredFrequencyMin

        this.setState({
            newDesiredFrequencyMin: value,
            canSubmit: canSubmit
        })
    }

    private onReset(evt: any) {
        const poll = this.props.timeTracker.poll

        if (!poll) return

        this.setState({
            newDesiredFrequencyMin: poll.getDesiredFrequencyMin(),
            canSubmit: false
        })
    }

    private onSubmit(evt: any) {
        evt.preventDefault()
        
        const pollChanges = {
            desiredFrequencyMin: this.state.newDesiredFrequencyMin
        }

        this.setState({isSubmitting: true})

        this.props.timeTracker.updatePoll(pollChanges)
            .then(() => {
                this.setState({
                    isSubmitting: false,
                    canSubmit: false
                })
            })

        return false
    }

}