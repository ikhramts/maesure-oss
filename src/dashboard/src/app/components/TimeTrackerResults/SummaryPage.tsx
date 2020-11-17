import * as React from 'react';
import { SummaryTable } from 'app/components/SummaryGrid/SummaryTable';
import { TotalsForActivity, TotalsResult, GroupByType } from 'shared/model';
import { SummaryTableViewState } from 'app/components/SummaryGrid';
import { SummaryTableRowViewState, MoveTargetState } from 'app/components/SummaryGrid/SummaryTableRowViewState';
import { ActivityGroupCreateRequest } from 'shared/api/ActivityGroupCreateRequest';
import { SummaryTableRowActions } from 'app/components/SummaryGrid/RowProps';
import { ActivityGroupMoveRequest } from 'shared/api/ActivityGroupMoveRequest';
import { Icon, Select } from 'antd';
import * as moment from 'moment';
import { NoDataYetMessage } from 'app/components/NoDataYetMessage';
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { AccountType } from 'shared/model/AccountType';
import { CSSTransition } from 'react-transition-group';
import { PeriodPicker } from './PeriodPicker';

export interface SummaryPageState {
    selectedGroupBy: GroupByType
    displayedGroupBy: GroupByType
    dailySummaryFromDate: Date
    dailySummaryToDate: Date
    dailySummary: TotalsResult | null
    isDailySummaryLoading: boolean
    viewState: SummaryTableViewState
    lastActivityBeingMoved?: TotalsForActivity
    exactParentMatchActivities?: TotalsForActivity[]
    loadingError?: string
    todayEpoch: number
}

export interface SummaryPageProps {
    timeTracker: TimeTrackerProxy
}

export class SummaryPage extends React.Component<SummaryPageProps, SummaryPageState> {

    public constructor(props: SummaryPageProps) {
        super(props)

        this.loadInitialDailySummary = this.loadInitialDailySummary.bind(this)
        this.setDailySummary = this.setDailySummary.bind(this)
        this.reloadDailySummary = this.reloadDailySummary.bind(this)
        this.onGroupByChanged = this.onGroupByChanged.bind(this)
        this.onDateRangeSelected = this.onDateRangeSelected.bind(this)
        this.toggleRowExpanded = this.toggleRowExpanded.bind(this)
        this.showChildActivityGroupInput = this.showChildActivityGroupInput.bind(this)
        this.hideChildActivityGroupInput = this.hideChildActivityGroupInput.bind(this)
        this.createActivityGroup = this.createActivityGroup.bind(this)
        this.setRowViewState = this.setRowViewState.bind(this)
        this.onBeginMoveActivityGroup = this.onBeginMoveActivityGroup.bind(this)
        this.onEndMoveActivityGroup = this.onEndMoveActivityGroup.bind(this)
        this.onDragEnterActivityGroup = this.onDragEnterActivityGroup.bind(this)
        this.onDragLeaveActivityGroup = this.onDragLeaveActivityGroup.bind(this)
        this.onMoveToActivityGroup = this.onMoveToActivityGroup.bind(this)
        this.onDeleteActivityGroup = this.onDeleteActivityGroup.bind(this)
        this.onEscKey = this.onEscKey.bind(this)
        this.keepCheckingIfDateChanged = this.keepCheckingIfDateChanged.bind(this)
        this.keepRefreshingDailySummaries = this.keepRefreshingDailySummaries.bind(this)

        let today = new Date()
        let periodStart = new Date()
        periodStart.setDate(periodStart.getDate() - 1)

        this.state = { 
            selectedGroupBy: GroupByType.DAY,
            displayedGroupBy: GroupByType.DAY,
            dailySummaryFromDate: periodStart,
            dailySummaryToDate: today,
            isDailySummaryLoading: false,
            dailySummary: null, 
            viewState: new SummaryTableViewState(),
            todayEpoch: moment(new Date()).startOf('day').toDate().getTime()
        }
    }

    componentDidMount() {
        this.loadInitialDailySummary()
        this.keepCheckingIfDateChanged()
        window.addEventListener('keydown', this.onEscKey)
        
        setTimeout(this.keepRefreshingDailySummaries, 5 * 60 * 1000)
    }

    componentDidUpdate(prevProps: SummaryPageProps) {
        // Check if the time tracker did anything that we should react to.
        const prevLastPollResponseChangeTime = prevProps.timeTracker.lastPollResponseChange.getTime()
        const newLastPollResponseChangeTime = this.props.timeTracker.lastPollResponseChange.getTime()

        if (prevLastPollResponseChangeTime != newLastPollResponseChangeTime) {
            this.reloadDailySummary()
        }
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.onEscKey)
        this._unmounted = true
    }

    render() {
        if (this.state.dailySummary == null) {
            return <div className="">
                
            </div>
        }

        let rowActions = {
            toggleExpand: this.toggleRowExpanded,
            showCreateActivityGroupInput: this.showChildActivityGroupInput,
            hideCreateActivityGroupInput: this.hideChildActivityGroupInput,
            createActivityGroup: this.createActivityGroup,
            onBeginMoveActivityGroup: this.onBeginMoveActivityGroup,
            onEndMoveActivityGroup: this.onEndMoveActivityGroup,
            onDragEnterActivityGroup: this.onDragEnterActivityGroup,
            onDragLeaveActivityGroup: this.onDragLeaveActivityGroup,
            onMoveToActivityGroup: this.onMoveToActivityGroup,
            onDeleteActivityGroup: this.onDeleteActivityGroup

        } as SummaryTableRowActions

        // Render the date range picker - if allowed
        const timeTracker = this.props.timeTracker
        const user = timeTracker.user

        let inputRow : JSX.Element | null = null

        if (user && user.accountType != AccountType.TEMPORARY) {
            // Animation that's showing that we're doing work.
            let loadingAnimation :JSX.Element | null
            const selectedGroupBy = this.state.selectedGroupBy

            if (this.state.isDailySummaryLoading) {
                loadingAnimation = <Icon type="loading"/> 
            } else {
                loadingAnimation = null
            }

            // The date range picker itself
            inputRow = <div className="inputRow">
                Report period 
                <Select className="selectGroupBy" value={selectedGroupBy} 
                        onChange={this.onGroupByChanged}>
                    <Select.Option value={GroupByType.DAY}>Days</Select.Option>
                    <Select.Option value={GroupByType.WEEK}>Weeks</Select.Option>
                    <Select.Option value={GroupByType.MONTH}>Months</Select.Option>
                    <Select.Option value={GroupByType.CUSTOM}>Custom</Select.Option>
                </Select>

                <PeriodPicker groupBy={selectedGroupBy}
                              from={this.state.dailySummaryFromDate}
                              to={this.state.dailySummaryToDate}
                              onChange={this.onDateRangeSelected}/>

                { loadingAnimation }
            </div>
        }

        // Displaying errors.
        let errorMessage : JSX.Element | null = null

        if (this.state.loadingError) {
            errorMessage = <p className="error">{this.state.loadingError}</p>
        }

        return <CSSTransition timeout={{enter: 500, appear: 500, exit: 500}} classNames="fade" in={true} mountOnEnter>
            <div className="">
                { inputRow }
                { errorMessage }
                <SummaryTable 
                    groupBy={this.state.displayedGroupBy}
                    dailySummary={this.state.dailySummary} 
                    viewState={this.state.viewState}
                    rowActions={rowActions}/>
                <NoDataYetMessage show={!this.state.dailySummary.hasData()}/>
            </div>
        </CSSTransition>
    }

    // ========================= Private ===========================
    private _unmounted : boolean = false

    private loadInitialDailySummary() : void {
        this.setState({
            isDailySummaryLoading: true
        })

        let fromDate = this.state.dailySummaryFromDate
        let toDate = this.state.dailySummaryToDate
        let groupBy = this.state.selectedGroupBy
        const apiClient = this.props.timeTracker.apiClient

        apiClient.fetchTotals(groupBy, fromDate, toDate)
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(dailySummary => {
                this.setDailySummary(dailySummary)
            })
    }

    private setDailySummary(dailySummary: TotalsResult | void) : Promise<void> {
        if (!dailySummary) {
            // Do nothing.
            return Promise.resolve()
        }

        return new Promise((resolve) => {
            const viewState =  this.state.viewState
            viewState.canShowMoveButton = hasFolders(dailySummary)

            this.setState({
                displayedGroupBy: this.state.selectedGroupBy,
                dailySummary: dailySummary,
                isDailySummaryLoading: false,
                loadingError: undefined,
                viewState: viewState,
                exactParentMatchActivities: findExactParentMatchActivities(dailySummary)
            }, () => resolve())
        })
    }

    private reloadDailySummary() : Promise<void> {
        const fromDate = this.state.dailySummaryFromDate
        const toDate = this.state.dailySummaryToDate
        const groupBy = this.state.selectedGroupBy

        return new Promise((resolve) => {
            this.setState({isDailySummaryLoading: true}, () => {
                const apiClient = this.props.timeTracker.apiClient

                return apiClient.fetchTotals(groupBy, fromDate, toDate)
                    .catch((err) => { 
                        // Swallow the error - something else will 
                        // deal with it.
                        this.setState({isDailySummaryLoading: false})
                     })
                    .then(dailySummary => this.setDailySummary(dailySummary))
                    .then(() => resolve())
            })
    
        })
    }

    private onGroupByChanged(groupBy: GroupByType) {
        // Set the default range.
        const today = moment().startOf('day').toDate()
        let periodStart = new Date()
        periodStart.setDate(periodStart.getDate() - 1)

        let newFrom = this.state.dailySummaryFromDate
        let newTo = this.state.dailySummaryToDate

        if (groupBy == GroupByType.DAY || groupBy == GroupByType.CUSTOM) {
            // Today and yesterday
            newFrom = new Date()
            newFrom.setDate(today.getDate() - 1)
            newTo = today
        } else if (groupBy == GroupByType.WEEK) {
            // This week and last week
            newFrom = moment().subtract(7, 'days').startOf('isoWeek').toDate()
            newTo = moment().startOf('isoWeek').toDate()
        } else if (groupBy == GroupByType.MONTH) {
            // This month and last month
            newFrom = moment().subtract(1, 'month').startOf('month').toDate()
            newTo = moment().startOf('month').toDate()
        }

        this.setState({
            selectedGroupBy: groupBy,
            dailySummaryFromDate: newFrom,
            dailySummaryToDate: newTo

        }, () => {
            this.reloadDailySummary()
        })
    }

    private onDateRangeSelected(newFrom: Date, newTo: Date) {
        this.setState({
            dailySummaryFromDate: newFrom,
            dailySummaryToDate: newTo
        }, () => {
            this.reloadDailySummary()
        })
    }

    private toggleRowExpanded(rowData: TotalsForActivity) : void {
        this.setRowViewState(rowData, (rowState) => {
            rowState.expanded = !rowState.expanded
        })
    }

    private showChildActivityGroupInput(rowData?: TotalsForActivity) : void {
        this.setRowViewState(rowData, (rowState) => {
            rowState.addingChild = true
        })
    }

    private hideChildActivityGroupInput(rowData?: TotalsForActivity) : void {
        this.setRowViewState(rowData, (rowState) => {
            rowState.addingChild = false
        })
    }

    private createActivityGroup(createRequest: ActivityGroupCreateRequest, 
                                parent?: TotalsForActivity) : void {
        this.setRowViewState(parent, (rowState) => {
            rowState.submittingChild = true
            rowState.processing = true
        })

        const apiClient = this.props.timeTracker.apiClient
        apiClient.createActivityGroup(createRequest)
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(() => this.reloadDailySummary())
            .then(() => {
                this.hideChildActivityGroupInput(parent)
                this.setRowViewState(parent, (rowState) => {
                    rowState.submittingChild = false
                    rowState.processing = false
                    rowState.expanded = true
                })
            })
    }

    private setRowViewState(rowData: TotalsForActivity | undefined, 
            applyChanges: (state: SummaryTableRowViewState) => void) : Promise<void> {
        let rowViewState = this.state.viewState.getRowViewState(rowData)
        let newRowViewState = new SummaryTableRowViewState(rowViewState)
        applyChanges(newRowViewState);

        let newTableViewState = 
            this.state.viewState.setRowViewState(newRowViewState, rowData)

        return new Promise((resolve) => {
            this.setState({ 
                ...this.state, 
                viewState: newTableViewState
            }, () => resolve())
        })
    }

    private onBeginMoveActivityGroup(activitySummary: TotalsForActivity) {
        // Set up drop targets
        // By default everything is a valid drop target EXCEPT this activity group and its children, and any synthetic activity groups.
        let newViewState = new SummaryTableViewState(this.state.viewState);
        let rowViewStates = newViewState.rowViewStates()

        // Set everything to accept drops by default.
        for (let key in rowViewStates) {
            let rowViewState = rowViewStates[key]
            rowViewState.moveTargetState = MoveTargetState.SHOULD_ACCEPT_MOVE
        }

        // Exclude this activity group and its children.
        prohibitDropOnActivityGroupTree(activitySummary, rowViewStates)

        // Mark this row as being moved.
        let targetRowViewState = rowViewStates[activitySummary.key]
        targetRowViewState.moveTargetState = MoveTargetState.IS_BEING_MOVED


        // Exclude rows that track exact response text matches for the parent activity.
        if (this.state.exactParentMatchActivities) {
            for (let exactParentMatchActivity of this.state.exactParentMatchActivities) {
                let rowViewState = newViewState.getRowViewState(exactParentMatchActivity)
                rowViewState.moveTargetState = MoveTargetState.SHOULD_NOT_ACCEPT_MOVE
            }
        }

        this.setState({...this.state, viewState: newViewState, lastActivityBeingMoved: activitySummary })
    }

    private onEndMoveActivityGroup() : Promise<void> {
        // Clear drop targets
        let newViewState = new SummaryTableViewState(this.state.viewState);
        let rowViewStates = newViewState.rowViewStates()

        for (let key in rowViewStates) {
            let rowViewState = rowViewStates[key]
            rowViewState.moveTargetState = MoveTargetState.NO_ACTIVE_MOVE
            rowViewState.isDraggedOver = false
            rowViewState.dragDepth = 0
        }

        return new Promise((resolve) => {
            this.setState({...this.state, viewState: newViewState }, () => resolve())
        })
        
    }

    private onDragEnterActivityGroup(targetActivityGroup?: TotalsForActivity) {
        this.setRowViewState(targetActivityGroup, (rowState) => {
            rowState.isDraggedOver = true
            rowState.dragDepth = rowState.dragDepth + 1
        })
    }

    private onDragLeaveActivityGroup(targetActivityGroup?: TotalsForActivity) {
        this.setRowViewState(targetActivityGroup, (rowState) => {
            const dragDepth = rowState.dragDepth - 1
            rowState.dragDepth = dragDepth
            rowState.isDraggedOver = dragDepth != 0
        })
    }

    private onMoveToActivityGroup(target?: TotalsForActivity) {
        if (!this.state.lastActivityBeingMoved) {
            return
        }

        // Provide visual feedback to the user that something is happening.
        this.setRowViewState(target, (rowState) => {
            rowState.processing = true
        })

        // Prep the move request.
        let source = this.state.lastActivityBeingMoved
        let moveRequest = { } as ActivityGroupMoveRequest

        if (source.activityGroupId) {
            moveRequest.id = source.activityGroupId
        } else {
            moveRequest.matchResponseText = source.name
        }
        
        if (target) {
            if (target.activityGroupId) {
                moveRequest.targetParentId = target.activityGroupId
            } else {
                moveRequest.targetParentMatchResponseText = target.name
                moveRequest.targetGrandparentId = target.parentId
            }
        } else {
            moveRequest.targetIsUncategorized = false;
        }

        // Send the request.
        const apiClient = this.props.timeTracker.apiClient

        apiClient.moveActivityGroup(moveRequest)
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(() => this.reloadDailySummary())
            .then(() => {
                // Visualy indicate that we're done.
                this.setRowViewState(target, (rowState) => {
                    rowState.processing = false
                })
            })
    }

    private onDeleteActivityGroup(target: TotalsForActivity) {
        if (!target.activityGroupId) {
            // Cannot delete activity groups that were automatically created.
            return
        }

        // Provide visual feedback to the user that something is happening.
        this.setRowViewState(target, (rowState) => {
            rowState.processing = true
        })

        // Send the request.
        const apiClient = this.props.timeTracker.apiClient

        apiClient.deleteActivityGroup(target.activityGroupId)
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(() => this.reloadDailySummary())
            .then(() => {
                // Delete the row viewState
                let newViewState = this.state.viewState.deleteRowViewState(target)
                this.setState({...this.state, viewState: newViewState})
            })
    }

    private onEscKey(evt: KeyboardEvent) {
        if (evt.keyCode == 27) {
            this.onEndMoveActivityGroup()
        }
    }

    private keepCheckingIfDateChanged() {
        if (this._unmounted) {
            return
        }

        const newTodayEpoch = moment(new Date()).startOf('day').toDate().getTime()
        const oldTodayEpoch = this.state.todayEpoch

        if (oldTodayEpoch < newTodayEpoch) {
            // Welcome to tomorrow!
            this.setState({todayEpoch: newTodayEpoch})

            // If the charts ended on today, we need to advance them by one day.
            const toDateEpoch = 
                moment(this.state.dailySummaryToDate).startOf('day').toDate().getTime()
            
            if (toDateEpoch == oldTodayEpoch) {
                const oldFromDate = this.state.dailySummaryFromDate
                const oldToDate = this.state.dailySummaryToDate

                const newFromDate = moment(oldFromDate).add(1, 'day').toDate()
                const newToDate = moment(oldToDate).add(1, 'day').toDate()

                this.setState({dailySummaryFromDate: newFromDate, dailySummaryToDate: newToDate}, () => {
                    this.reloadDailySummary()
                })
            }

        }

        // Keep checking.
        setTimeout(this.keepCheckingIfDateChanged, 60 * 1000)
    }

    private keepRefreshingDailySummaries() {
        if (this._unmounted) {
            return
        }

        this.reloadDailySummary()

        // Keep refreshing.
        setTimeout(this.keepRefreshingDailySummaries, 5 * 60 * 1000)
    }
}

function prohibitDropOnActivityGroupTree(activitySummary: TotalsForActivity, 
                                         rowViewStates: { [id: string] : SummaryTableRowViewState}) {
    let rowViewState = rowViewStates[activitySummary.key]
    rowViewState.moveTargetState = MoveTargetState.SHOULD_NOT_ACCEPT_MOVE

    if (rowViewState.expanded && activitySummary.children) {
        for (let child of activitySummary.children) {
            prohibitDropOnActivityGroupTree(child, rowViewStates)
        }
    }
}

function findExactParentMatchActivities(dailySummary: TotalsResult) : TotalsForActivity[] {
    let found : TotalsForActivity[] = []

    for (let activity of dailySummary.activities) {
        found.push(...findExactParentMatchActivitiesInTree(activity))
    }

    return found
}

function findExactParentMatchActivitiesInTree(activitySummary: TotalsForActivity) : TotalsForActivity[] {
    if (activitySummary.tracksExactParentMatches) {
        return [activitySummary]
    }

    if (!activitySummary.children) {
        return []
    }

    let found : TotalsForActivity[] = []

    for (let child of activitySummary.children) {
        found.push(...findExactParentMatchActivitiesInTree(child))
    }

    return found
}

function hasFolders(dailySummary: TotalsResult) : boolean {
    if (!dailySummary.activities || dailySummary.activities.length == 0) {
        return false
    }

    for (const activity of dailySummary.activities) {
        if (activity.children && activity.children.length > 0) {
            return true
        }

        if (!activity.tracksPollResponseText) {
            return true
        }
    }

    return false
}