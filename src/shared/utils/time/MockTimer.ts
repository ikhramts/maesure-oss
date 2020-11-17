import { ITimer } from "./ITimer";

export class MockTimer implements ITimer {
    public isRunning = false
    public intervalMsec = 0
    public shouldRepeat = true
    
    async triggerElapsed() : Promise<void> {
        const promise = this.onElapsed?.()

        if (promise && typeof promise.then == 'function') {
            // It's an asyunc function.
            return promise
        } else {
            // It's a sync function.
            return Promise.resolve()
        }
    }
    
    start(): void {
        this.isRunning = true
    }    
    
    stop(): void {
        this.isRunning = false
    }
    
    setInterval(durationMsec: number): void {
        this.intervalMsec = durationMsec
    }

    setRepeat(shouldRepeat: boolean) {
        this.shouldRepeat = shouldRepeat
    }
    
    onElapsed?: (() => Promise<void> | void) | undefined;
}