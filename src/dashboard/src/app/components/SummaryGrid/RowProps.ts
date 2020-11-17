import { TotalsForActivity } from "shared/model";
import { ActivityGroupCreateRequest } from "shared/api/ActivityGroupCreateRequest";
import { SummaryTableViewState } from ".";

export interface SummaryTableRowActions {
    toggleExpand: (rowData: TotalsForActivity) => void
    showCreateActivityGroupInput: (parent?: TotalsForActivity) => void
    hideCreateActivityGroupInput: (parent?: TotalsForActivity) => void
    createActivityGroup: (createRequest: ActivityGroupCreateRequest, parent?: TotalsForActivity) => void
    onBeginMoveActivityGroup: (activitySummary: TotalsForActivity) => void
    onEndMoveActivityGroup: () => Promise<void>
    onDragEnterActivityGroup: (target?: TotalsForActivity) => void
    onDragLeaveActivityGroup: (target?: TotalsForActivity) => void
    onMoveToActivityGroup: (target?: TotalsForActivity) => void
    onDeleteActivityGroup: (target: TotalsForActivity) => void
}

export interface RowProps {
    activitySummary: TotalsForActivity
    viewState: SummaryTableViewState
    rowActions: SummaryTableRowActions
    depth: number
}