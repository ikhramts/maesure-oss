import { ITimer } from "./ITimer";

export interface ITimerFactory {
    getTimer() : ITimer
}