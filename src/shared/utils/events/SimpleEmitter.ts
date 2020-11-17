export class SimpleEmitter<T> {
    addHandler(handler: (value: T) => void) : void {
        this._handlers.push(handler)
    }

    emit(value: T) : void {
        for (const handler of this._handlers) {
            handler(value)
        }
    }

    // =============== Private ===============
    private _handlers : ((value: T) => void)[] = []
}