export interface ITimer {
    start() : void
    stop(): void
    setInterval(durationMsec: number) : void
    setRepeat(shouldRepeat: boolean) : void

    onElapsed?: () => Promise<void> | void
}