import { ITimeService } from "./ITimeService";
import * as moment from 'moment'

export class MockTimeService implements ITimeService {
    setNow(date: Date) {
        this._now = date
    }

    advance(amount: moment.DurationInputArg1, units : moment.DurationInputArg2) {
        const nowMoment = moment(this._now)
        nowMoment.add(amount, units)
        this._now = nowMoment.toDate()
    }

    now() {
        if (this._now.getTime() == 0) {
            throw "You forgot to set the current time for the MockTimeService. Use 'setNow()' to do it."
        }

        return this._now
    }

    // ============ Private =============
    private _now : Date = new Date(0)
}