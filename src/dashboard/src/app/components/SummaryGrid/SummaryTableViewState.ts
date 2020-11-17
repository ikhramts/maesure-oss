import { SummaryTableRowViewState } from "./SummaryTableRowViewState";
import { TotalsForActivity } from "shared/model";

export class SummaryTableViewState {
    public canShowMoveButton = true

    public constructor(init? : SummaryTableViewState) {
        if (init) {
            Object.assign(this, init)

            if (init._rowViewStates) {
                for (let key in init._rowViewStates) {
                    this._rowViewStates[key] = new SummaryTableRowViewState(init._rowViewStates[key])
                }
            }
        }
    }

    public getRowViewState(activitySummary?: TotalsForActivity) : SummaryTableRowViewState {
        let key = getActivityKey(activitySummary)
        let rowViewState = this._rowViewStates[key]

        if (!rowViewState) {
            rowViewState = new SummaryTableRowViewState()
            this._rowViewStates[key] = rowViewState
        }

        return rowViewState
    }

    public setRowViewState(rowState: SummaryTableRowViewState, activitySummary?: TotalsForActivity) : SummaryTableViewState {
        const newTableState = new SummaryTableViewState(this)
        const key = getActivityKey(activitySummary)
        newTableState._rowViewStates[key] = rowState

        return newTableState
    }

    public deleteRowViewState(activitySummary: TotalsForActivity) : SummaryTableViewState {
        var newRowViewStates: { [id: string] : SummaryTableRowViewState} = {};
        let keyToDelete = getActivityKey(activitySummary)

        for (let key in this._rowViewStates) {
            if (key != keyToDelete)
                newRowViewStates[key] = this._rowViewStates[key];
        }

        let newTableState = new SummaryTableViewState(this)
        newTableState._rowViewStates = newRowViewStates;

        return newTableState
    }

    public rowViewStates() : { [id: string] : SummaryTableRowViewState} {
        return this._rowViewStates
    }

    // ================ Private ==================
    private _rowViewStates : { [id: string] : SummaryTableRowViewState} = {}

}

function getActivityKey(activitySummary?: TotalsForActivity) : string {
    if (activitySummary) {
        return activitySummary.key
    } else {
        return "root";
    }
}