import * as React from 'react';
import * as moment from 'moment';
import { Icon } from 'antd';
import { TotalsResult, GroupByType } from 'shared/model';
import { SummaryTableViewState } from './SummaryTableViewState';
import { CreateChildActivityInput } from './CreateChildActivityInput';
import { makeSpacers } from './utils';
import { SummaryTableRowActions, RowProps } from './RowProps';
import { RowDragHandle } from './RowDragHandle';
import { MoveTargetState } from './SummaryTableRowViewState';
import { ExpandToggle } from '../icons/ExpandToggle';
import { ActionIcon } from 'shared/components/ActionIcon';
import { formatDuration } from 'shared/utils/time/TimeFormats'

export interface SummaryTableProps {
    groupBy: GroupByType
    dailySummary: TotalsResult
    viewState: SummaryTableViewState
    rowActions: SummaryTableRowActions
}

export function SummaryTable (props: SummaryTableProps) {
    let dailySummary = props.dailySummary
    let rowActions = props.rowActions

    // Compose the header row
    const groupBy = props.groupBy
    var headerCells = []

    for (let columnDate of dailySummary.startingDates) {
        // Render the date.
        // We'll have to force the date to render in UTC instead of local time zone because
        // that's how it gets sent over.
        const headerCell = renderHeaderDate(columnDate, groupBy)
        headerCells.push(headerCell)
    }

    // Setup the root of the activity tree to receive moves and drag-and-drops.
    const rootViewState = props.viewState.getRowViewState(/* root */);
    let activityHeaderDropClass = ""
    let activityHeaderHandlers = {}
    let moveClickTarget : JSX.Element | null = null

    if (rootViewState.moveTargetState == MoveTargetState.SHOULD_ACCEPT_MOVE) {
        activityHeaderHandlers = {
            onDragEnter: (evt: React.DragEvent) => {
                evt.preventDefault()
                rowActions.onDragEnterActivityGroup(undefined) // root
            },
            onDragLeave: () => {
                rowActions.onDragLeaveActivityGroup(undefined)// root
            },
            onDragOver: (evt: React.DragEvent) => {
                evt.preventDefault()
                // Nothing here. We just want to provide this hander.
            },
            onDrop: (evt: React.DragEvent) => {
                evt.preventDefault()
                rowActions.onMoveToActivityGroup(undefined)// root
            }
        }

        if (rootViewState.isDraggedOver) {
            activityHeaderDropClass += " isDraggedOver"
        }

        const onMoveToRoot = (evt:any) => {
            evt.preventDefault()
            rowActions.onEndMoveActivityGroup().then(() => {
                rowActions.onMoveToActivityGroup(undefined)// root
            })
        }

        moveClickTarget = <a href="" onClick={onMoveToRoot} {...activityHeaderHandlers}>(Move to top level)</a>
    }

    // Compose the body.
    let rows: JSX.Element[] = []

    // Form to create the new root activity.
    const showCreateTopLevelActivity = () => {
        props.rowActions.showCreateActivityGroupInput(/* root */)
    }

    if (rootViewState.addingChild) {
        rows.push(<CreateChildActivityInput depth={0}
                                            key="rootCreateActivityGroup" 
                                            rowActions={rowActions}
                                            viewState={props.viewState}/>)
    }

    // Categorized activities.
    for (let activitySummary of dailySummary.activities) {
        let rowProps = {
            activitySummary: activitySummary,
            depth: 0,
            rowActions: props.rowActions,
            viewState: props.viewState
        } as RowProps

        rows = rows.concat(makeTableRows(rowProps))
    }

    // The final output.
    let activityHeaderClass = "activityName" + activityHeaderDropClass;

    return <table className="summaryTable">
        <thead>
            <tr>
                <th className={activityHeaderClass} {...activityHeaderHandlers}>{moveClickTarget}</th>
                <th className="controls">
                    <ActionIcon type="folder-add" toolTip="Add folder" onClick={showCreateTopLevelActivity}/>
                </th>
                { headerCells }
            </tr>
        </thead>
        <tbody>
            { rows }
        </tbody>
    </table>
}

function makeTableRows(rowProps: RowProps) : JSX.Element[] {
    let activitySummary = rowProps.activitySummary
    let viewState = rowProps.viewState
    let rowActions = rowProps.rowActions

    // We will make a row and any of its subrows.
    let rows = []

    //// Start making the main row data.
    let rowViewState = viewState.getRowViewState(activitySummary)
    let hasSubrows = activitySummary.children && (activitySummary.children.length > 0)

    // Create the cells with time totals.
    let cells = []
    for (let i = 0; i < activitySummary.timeSpentPerPeriod.length; i++) {
        const timeSpent = activitySummary.timeSpentPerPeriod[i]
        const timeSpentStr = formatDuration(timeSpent)
        const isZeroTimeSpent = (timeSpentStr == "0:00") ? "zero" : "";
        const formattedTime = <span className={isZeroTimeSpent}> { timeSpentStr }</span>
        cells.push(<td className="summaryColumn" key={i}>{ formattedTime }</td>)
    }

    // Create the control box.
    let controlElements = []

    if (viewState.canShowMoveButton) {
        if (rowViewState.moveTargetState == MoveTargetState.NO_ACTIVE_MOVE) {
            const moveButton = <ActionIcon key="move" type="drag" toolTip="Move" 
                    onClick={() => {rowActions.onBeginMoveActivityGroup(activitySummary)}} />
            controlElements.push(moveButton)
    
        } else if (rowViewState.moveTargetState == MoveTargetState.IS_BEING_MOVED) {
            const moveButton = <ActionIcon key="move" type="stop" toolTip="Cancel move" 
                    onClick={() => {rowActions.onEndMoveActivityGroup()}} />
    
            controlElements.push(moveButton)
        } else {
            const actionIconSpacer = <ActionIcon key="move" type="spacer"
                    onClick={() => {}} />
    
            controlElements.push(actionIconSpacer)
        }
    }

    if (!activitySummary.tracksExactParentMatches 
        && !rowViewState.processing
        && !activitySummary.tracksPollResponseText) {
        // This is a normal activity group, not one that exists to separate cases when the user 
        // typed in its exact name.
        controlElements.push(<ActionIcon key="add" type="folder-add" toolTip="Add subfolder" 
                                onClick={() => rowActions.showCreateActivityGroupInput(activitySummary)}/>)

        if (activitySummary.activityGroupId)
            // Can only delete activities that the user created manually.
            controlElements.push(<ActionIcon key="delete" type="delete" toolTip="Delete" danger={true} 
                                    onClick={() => rowActions.onDeleteActivityGroup(activitySummary) }/>)
    }

    const controls = <td className="controls">{ controlElements }</td>

    // The activity's ability to receive drops.
    let dropClass = ""
    let dragHandlers = {}

    if (rowViewState.moveTargetState == MoveTargetState.SHOULD_NOT_ACCEPT_MOVE
        || rowViewState.moveTargetState == MoveTargetState.IS_BEING_MOVED) {
        dropClass = " doesNotAcceptDrop"

    } else if (rowViewState.moveTargetState == MoveTargetState.SHOULD_ACCEPT_MOVE) {
        dragHandlers = {
            onDragEnter: (evt: React.DragEvent) => {
                evt.preventDefault()
                rowActions.onDragEnterActivityGroup(activitySummary)
            },
            onDragLeave: () => {
                rowActions.onDragLeaveActivityGroup(activitySummary)
            },
            onDragOver: (evt: React.DragEvent) => {
                evt.preventDefault()
                evt.dataTransfer.dropEffect = 'move'
                // Nothing here. We just want to provide this hander.
            },
            onDrop: (evt: React.DragEvent) => {
                evt.preventDefault()
                rowActions.onMoveToActivityGroup(activitySummary)
            }
        }

        if (rowViewState.isDraggedOver) {
            dropClass += " isDraggedOver"
        }
    }

    // The activity's name.
    const activityName = activitySummary.name + (activitySummary.tracksExactParentMatches ? " (exact match)" : "")    
    
    // The activity's move handling.
    let activityNameElement : JSX.Element | string
    
    if (rowViewState.moveTargetState == MoveTargetState.SHOULD_ACCEPT_MOVE) {
        const handleMoveToActivity = (evt:any) => {
            evt.preventDefault()
            rowActions.onEndMoveActivityGroup().then(() => {
                rowActions.onMoveToActivityGroup(activitySummary)
            })
        }

        activityNameElement = <a href="" onClick={handleMoveToActivity}>{ activityName }</a>
    
    } else {
        activityNameElement = activityName
    }

    // The combined class.
    let rowClassName = rowProps.depth == 0 ? "topLevel" : ""
    let activityColumnClassName = "cellContents" + dropClass

    // Status icon
    let statusIcon = rowViewState.processing ? <Icon type="loading"/> : null

    // Put it all together.
    var mainRow = <tr key={activitySummary.key} className={rowClassName}>
        <td className="activityName" {...dragHandlers}>
            { makeSpacers(rowProps.depth) }
            <ExpandToggle onClick={() => rowActions.toggleExpand(activitySummary)}
                                     expanded={rowViewState.expanded}
                                     empty={!hasSubrows} />
            <RowDragHandle {...rowProps}/>
            <div className={ activityColumnClassName } ><span>{ activityNameElement } { statusIcon }</span></div>
        </td>
        { controls }
        { cells }
    </tr>

    rows.push(mainRow)

    // New activity sub-group entry
    if (rowViewState.addingChild) {
        let newActivityGroupInput = <CreateChildActivityInput key={activitySummary.key + "|newActivityGroupInput"} 
                                                            {...rowProps}/>
        rows.push(newActivityGroupInput)
    }

    //// Subrows.
    if (rowViewState.expanded && hasSubrows) {
        for (let childActivity of activitySummary.children) {
            let subrowProps = {
                activitySummary: childActivity,
                depth: rowProps.depth + 1,
                rowActions: rowActions,
                viewState: viewState
            } as RowProps

            let subrows = makeTableRows(subrowProps)
            rows = rows.concat(subrows)
        }
    }

    return rows
}

function renderHeaderDate(headerDate: Date, groupBy: GroupByType) {
    // Render the date.
    // We'll have to force the date to render in UTC instead of local time zone because
    // that's how it gets sent over.
    const momentDate = moment(headerDate)
    const columnDateMsec = momentDate.startOf('day').toDate().getTime()
    const colKey = columnDateMsec
    const todayMsec = moment().startOf('day').toDate().getTime()

    let headerCell : JSX.Element

    if (groupBy == GroupByType.DAY) {
        const dayOfWeek = momentDate.format("ddd")
        const date = momentDate.format('MMM D')
    
        if (columnDateMsec == todayMsec) {
            headerCell = <th className="summaryColumn" key={colKey}>Today</th>
        
        } else {
            headerCell = <th className="summaryColumn" key={colKey}>{dayOfWeek}<br/>{date}</th>
        }
    } else if (groupBy == GroupByType.WEEK) {
        const thisWeekMsec = moment().startOf('isoWeek').toDate().getTime()
        const date = momentDate.format('MMM D')

        if (columnDateMsec == thisWeekMsec) {
            headerCell = <th className="summaryColumn" key={colKey}>This<br/>week</th>
        } else {
            headerCell = <th className="summaryColumn" key={colKey}>Wk of<br/>{date}</th>
        }
    } else if (groupBy == GroupByType.MONTH) {
        const month = momentDate.format("MMM")
        const year = momentDate.format("YYYY")

        headerCell = <th className="summaryColumn" key={colKey}>{month}<br/>{year}</th>

    } else /*if (groupBy == GroupByType.CUSTOM)*/ {
        // Catch-all for okay-ish degradation
        headerCell = <th className="summaryColumn" key={colKey}><br/>Total</th>
    }

    return headerCell
}