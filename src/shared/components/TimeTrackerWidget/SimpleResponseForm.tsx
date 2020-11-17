import * as React from 'react'
import { Button } from 'antd';
import { PollPopup } from 'shared/model/PollPopup';
import { PollResponse } from 'shared/model/PollResponse';
import { EntryTextAutocomplete } from '../EntryTextAutocomplete/EntryTextAutocomplete';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { SubmissionType } from 'shared/model/SubmissionTypes';

export interface SimpleResponseFormProps {
    timeTracker: TimeTrackerProxy
}

export interface SimpleResponseFormState {
    entryText: string
}

export class SimpleResponseForm 
extends React.Component<SimpleResponseFormProps, SimpleResponseFormState> {

    constructor(props: SimpleResponseFormProps) {
        super(props)

        this.hasResponseText = this.hasResponseText.bind(this)
        this.submitResponse = this.submitResponse.bind(this)

        const popup = props.timeTracker.showingPopup

        this.state = {
            entryText: popup ? popup.suggestedResponse : ""
        }
    }

    render() {
        const timeTracker = this.props.timeTracker
        const popupService = timeTracker.popupService
        const popup = timeTracker.showingPopup

        if (!popup) {
            return null
        }

        const onChanged = (value:any) => {
            const entryText = value as string
            this.setState({entryText: entryText})
        }

        const onSubmit = (evt?:any) => {
            if (evt) {
                evt.preventDefault()
            }

            if (!this.hasResponseText()) {
                return
            }

            const response = getPollResponse(popup, this.state.entryText)
            popupService.popupCompleted(popup, [response])
            this.setState({entryText: ""})
        }

        const onSwitchFormClicked = (evt:any) => {
            evt.preventDefault()
            popupService.switchToDetailedPopup()
        }

        return <div className="timeTrackerInput openTextInput">
            <p id="timeTrackerWidget_openText_question" className="question">{popup.question}</p>
            <form className="responseArea" onSubmit={onSubmit}>
                <EntryTextAutocomplete 
                    id="timeTrackerWidget_openText_input"
                    value={this.state.entryText}
                    responseSuggestionService={timeTracker.responseSuggestionService}
                    onChanged={onChanged}
                    onSubmit={onSubmit}
                    onUserInteracted={popupService.userInteractedWithPopup}
                    onSelect={this.submitResponse}
                    autoFocus={true}/>
                <Button id="timeTrackerWidget_submit" type="primary" 
                    onClick={onSubmit} disabled={!this.hasResponseText()}>Submit</Button>
                <a id="timeTrackerInput_switchToDetailedForm" href=""
                    onClick={onSwitchFormClicked}>
                        More details
                </a>
            </form>
        </div>
    }

    // ============= Private ================
    private submitResponse(responseText: string) : void {
        const timeTracker = this.props.timeTracker
        const popup = timeTracker.showingPopup!!

        const response = getPollResponse(popup, responseText)
        timeTracker.popupService.popupCompleted(popup, [response])
        this.setState({entryText: ""})
    }

    private hasResponseText() : boolean {
        // Must be non-falsy and not just whitespace
        const entryText = this.state.entryText
        return !(!entryText) && /\S/.test(entryText)
    }
}

function getPollResponse(popup: PollPopup, responseText: string) {
    return new PollResponse({
        timeCollected: popup.timeCollected,
        timeBlockLengthMin: popup.timeBlockLengthMin,
        responseText: responseText,
        submissionType: SubmissionType.SIMPLE_POPUP,
    })
}
