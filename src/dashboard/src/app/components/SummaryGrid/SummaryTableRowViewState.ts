export enum MoveTargetState {
    NO_ACTIVE_MOVE, SHOULD_ACCEPT_MOVE, SHOULD_NOT_ACCEPT_MOVE, IS_BEING_MOVED
}

export class SummaryTableRowViewState {
    public expanded: boolean = false
    public addingChild: boolean = false
    public submittingChild: boolean = false
    public processing: boolean = false
    public moveTargetState: MoveTargetState = MoveTargetState.NO_ACTIVE_MOVE
    public isDraggedOver: boolean = false
    public dragDepth: number = 0

    public constructor(init? : Partial<SummaryTableRowViewState>) {
        if (init) {
            Object.assign(this, init);
        }
    }
}