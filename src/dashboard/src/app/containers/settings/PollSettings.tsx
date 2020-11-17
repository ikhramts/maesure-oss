import * as React from 'react';
import * as moment from 'moment'
import { TimePicker, InputNumber, Button, Icon, message } from 'antd'
import { Poll } from 'shared/model/Poll';
import { PollUpdateRequest } from 'shared/api/PollUpdateRequest';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';

export interface PollSettingsState {
    poll?: Poll
    pollSettingsFormState?: PollSettingsFormProps
    loadingPoll: boolean
}

export interface PollSettingsProps {
    timeTracker: TimeTrackerProxy
}

export class PollSettings extends React.Component<PollSettingsProps, PollSettingsState> {
    constructor(props: PollSettingsProps) {
        super(props)

        this.reloadPoll = this.reloadPoll.bind(this)
        this.onPollSettingsFormChange = this.onPollSettingsFormChange.bind(this)
        this.onSubmitPollSettingsForm = this.onSubmitPollSettingsForm.bind(this)
        this.onClickResetPollSettingsForm = this.onClickResetPollSettingsForm.bind(this)
        this.resetPollSettingsForm = this.resetPollSettingsForm.bind(this)

        this.state = {
            loadingPoll: true,
        }
    }

    public componentDidMount() {
        this.reloadPoll();
    }

    public render() {
        let pollSettingsFormState = this.state.pollSettingsFormState        
        let pollSettingsForm = pollSettingsFormState ? <PollSettingsForm {...pollSettingsFormState}/> : <p>Loading...</p>

        return <div>
            { pollSettingsForm }
        </div>
    }

    private reloadPoll() : Promise<void> {
        const apiClient = this.props.timeTracker.apiClient
        return apiClient.fetchDefaultPoll()
            .then(poll => {
                this.setState({ poll: poll, loadingPoll: false })
                this.resetPollSettingsForm(poll)
            })
    }

    private onPollSettingsFormChange(updates: Partial<PollSettingsFormProps>) {
        let newFormState = {
            ...this.state.pollSettingsFormState,
        } as PollSettingsFormProps

        Object.assign(newFormState, updates)

        // Validate.
        if (newFormState.activeFrom.isBefore(newFormState.activeTo)) {
            newFormState.activeFromError = undefined
            newFormState.activeToError = undefined
            newFormState.canSubmit = true
        } 
        
        if (updates.activeFrom && updates.activeFrom.isAfter(newFormState.activeTo)) {
            newFormState.activeFromError = "This cannot be after the popup end time."
            newFormState.canSubmit = false
        } 
        
        if (updates.activeTo && updates.activeTo.isBefore(newFormState.activeFrom)) {
            newFormState.activeToError = "This cannot be after the popup start time."
            newFormState.canSubmit = false
        }

        this.setState({pollSettingsFormState: newFormState})
    }

    private onSubmitPollSettingsForm() {
        // Do not submit if not allowed to.
        let formState = this.state.pollSettingsFormState
        if (!formState || !formState.canSubmit  || formState.isSubmitting)
            return

        // Visually indicate that we're submitting.
        this.setState({
            pollSettingsFormState: { ...formState, isSubmitting: true }
        })

        // Submit the changes and reload the poll.
        let request = {
            activeFrom: formState.activeFrom.format("HH:mm:ss"),
            activeTo: formState.activeTo.format("HH:mm:ss"),
            desiredFrequencyMin: formState.desiredFrequencyMin,
        } as PollUpdateRequest

        const apiClient = this.props.timeTracker.apiClient
        apiClient.updateDefaultPoll(request)
            .then(() => this.reloadPoll())
            .then(() => message.success("Changes saved."))
    }

    private onClickResetPollSettingsForm() {
        if (!this.state.poll)
            return

        this.resetPollSettingsForm(this.state.poll)
    }

    private resetPollSettingsForm(poll: Poll) {
        let newFormState = {
            activeFrom: moment(poll.activeFrom, "HH:mm:ss"),
            activeTo: moment(poll.activeTo, "HH:mm:ss"),
            desiredFrequencyMin: moment.duration(poll.desiredFrequency).minutes(),
            canSubmit: false,
            isSubmitting: false,
            onSubmit: this.onSubmitPollSettingsForm,
            onReset: this.onClickResetPollSettingsForm,
            onChange: this.onPollSettingsFormChange,
        } as PollSettingsFormProps

        this.setState({pollSettingsFormState: newFormState})
    }
}

interface PollSettingsFormProps {
    activeFrom: moment.Moment
    activeTo: moment.Moment
    desiredFrequencyMin: number

    activeFromError?: string
    activeToError?: string

    canSubmit: boolean
    isSubmitting: boolean
    onChange: (updates: Partial<PollSettingsFormProps>) => void
    onSubmit: () => void
    onReset: () => void
}

function PollSettingsForm(props: PollSettingsFormProps) {
    let onActiveFromChanged = (value : moment.Moment) => {
        props.onChange({activeFrom: value})
    }

    let onActiveToChanged = (value : moment.Moment) => {
        props.onChange({activeTo: value})
    }

    let onDesiredFrequencyMinChanged = (value?: number) => {
        props.onChange({desiredFrequencyMin: value})
    }

    return <form>
        <div className="formRow">
            <label>Start popups at</label>
            <TimePicker value={props.activeFrom} 
                format="hh:mm A" 
                minuteStep={5} 
                use12Hours={true}
                onChange={onActiveFromChanged} 
                allowClear={false} />
            { props.activeFromError && <p className="formError">{props.activeFromError}</p> }
        </div>
        <div className="formRow">
            <label>End popups at</label>
            <TimePicker value={props.activeTo} 
                format="hh:mm A" 
                minuteStep={5}
                use12Hours={true}
                onChange={onActiveToChanged}
                allowClear={false}/>
            { props.activeToError && <p className="formError">{props.activeToError}</p> }
        </div>
        <div className="formRow">
            <label>Popup frequency (minutes)</label>
            <InputNumber value={props.desiredFrequencyMin} 
                min={1} max={59}
                onChange={onDesiredFrequencyMinChanged}/>
        </div>
        <div className="submitRow">
            <Button className="medium" 
                    type="primary" 
                    disabled={!props.canSubmit || props.isSubmitting} 
                    onClick={props.onSubmit}>
                { props.isSubmitting ? <Icon type="sync" spin={true}/>  : "Save" }
            </Button>
            <Button className="medium" type="default" onClick={props.onReset}>Reset</Button>
        </div>
    </form>
}