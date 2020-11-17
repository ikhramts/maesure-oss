import * as React from 'react'
import { TimeTrackerWidgetProps } from "./TimeTrackerWidgetProps";
import { Button } from 'antd';
import { PollResponse } from 'shared/model/PollResponse';
import { PollPopup } from 'shared/model/PollPopup';
import { YesNo } from 'shared/model/YesNo';

export function YesNoResponseForm(props: TimeTrackerWidgetProps) {
    const timeTracker = props.timeTracker
    const popupService = timeTracker.popupService
    const popup = timeTracker.showingPopup

    if (!popup) {
        return null
    }

    const onYesClicked = (evt: any) => {
        evt.preventDefault()
        const response = composeResponse(popup, YesNo.YES)
        popupService.popupCompleted(popup, [response])
    }

    const onNoClicked = (evt: any) => {
        evt.preventDefault()
        const response = composeResponse(popup, YesNo.NO)
        popupService.popupCompleted(popup, [response])
    }

    return <div className="timeTrackerInput yesNoInput">
            <p id="timeTrackerWidget_yesNoInput_question" className="question">{popup.question}</p>
            <div className="responseArea">
                <Button id="timeTrackerWidget_yesNoInput_yes" type="primary" onClick={onYesClicked}>Yes</Button>
                <Button id="timeTrackerWidget_yesNoInput_no" type="primary" onClick={onNoClicked}>No</Button>
            </div>
        </div>
}

function composeResponse(popup: PollPopup, responseText: string) : PollResponse {
    return new PollResponse({
        responseText: responseText,
        timeCollected: popup.timeCollected,
        timeBlockLengthMin: popup.timeBlockLengthMin
    })
}