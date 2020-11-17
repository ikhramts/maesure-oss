import { ITimerFactory } from "./ITimerFactory";
import { Timer } from "./Timer";

export class TimerFactory implements ITimerFactory {
    getTimer() {
        return new Timer()
    }
}