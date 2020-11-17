import * as moment from 'moment'
import { QuestionType } from "./QuestionType";

export class PollPopup {
    timeCollected: Date = new Date(0)
    timeBlockLengthMin: number = 0
    timeQueued: Date = new Date(0)
    isBackfill: boolean = false
    question: string = ""
    originatorName: string = ""
    questionType: QuestionType = QuestionType.Simple
    suggestedResponse: string = ""
    
    constructor(init?: Partial<PollPopup>) {
        if (!init) return

        Object.assign(this, init)
    }

    getToTime() : Date {
        return moment(this.timeCollected)
            .add(this.timeBlockLengthMin, 'minutes')
            .toDate()
    }
}