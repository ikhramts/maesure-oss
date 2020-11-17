import { ITimerFactory } from "./ITimerFactory";
import { MockTimer } from "./MockTimer";

export class MockTimerFactory implements ITimerFactory {
    getTimer() {
        const timer = new MockTimer()
        this.lastTimer = timer
        return timer;
    }

    public lastTimer: MockTimer | null = null
}