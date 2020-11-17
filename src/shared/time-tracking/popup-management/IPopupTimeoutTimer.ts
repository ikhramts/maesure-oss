export interface IPopupTimeoutTimer {
    onPopupTimedOut(handler: () => void) : void
    startTimingPopup() : void
    resetGracePeriod() : void
    endTimingPopup() : void
    disableTimeout() : void
    enableTimeout() : void
}