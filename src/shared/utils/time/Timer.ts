import { ITimer } from "./ITimer";
import { Guid } from "guid-typescript"

export class Timer implements ITimer {
    onElapsed?: (() => Promise<void> | void) | undefined;

    constructor() {
        this.onSetTimeoutElapsed = this.onSetTimeoutElapsed.bind(this)
    }

    start(): void {
        if (this._intervalMsec == 0) {
            throw new Error("The interval has not been set. Use setInterval() to set it.");
        }

        if (this._intervalMsec < 0) {
            throw new Error("The interval cannot be negative. Current interval is " + this._intervalMsec);
        }

        const timerInstance = Guid.raw()
        this._timerInstance = timerInstance
        setTimeout(this.onSetTimeoutElapsed, this._intervalMsec, timerInstance)
    }    
    
    stop(): void {
        this._timerInstance = null
    }

    setInterval(intervalMsec: number): void {
        this._intervalMsec = intervalMsec
    }

    setRepeat(shouldRepeat:boolean) {
        this._shouldRepeat = shouldRepeat
    }

    // ============== Private ==============
    private _intervalMsec = 0
    private _timerInstance: string | null = null
    private _shouldRepeat = true

    private onSetTimeoutElapsed(timerInstance: string) : Promise<void> {
        if (!this._timerInstance || this._timerInstance != timerInstance) {
            // This timer was stopped.
            return Promise.resolve()
        }

        const promise = this.onElapsed?.()

        if (promise && typeof promise.then == 'function') {
            // onElapsed is an async function.
            return promise.then(() => {
                if (this._shouldRepeat) {
                    setTimeout(this.onSetTimeoutElapsed, this._intervalMsec, timerInstance)
                }
            })
        } else {
            if (this._shouldRepeat) {
                setTimeout(this.onSetTimeoutElapsed, this._intervalMsec, timerInstance)
            }

            return Promise.resolve()
        }

    }
}