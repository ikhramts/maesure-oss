import * as React from 'react'
import { RowProps } from './RowProps';
import { Tooltip, Icon } from 'antd';

export function RowDragHandle(props: RowProps) {
    let dragHandle: JSX.Element

    if (!props.activitySummary.tracksExactParentMatches) {
        let onDragStart = (evt: React.DragEvent<HTMLDivElement>) => {
            evt.dataTransfer.dropEffect = "move"
            evt.dataTransfer.setData("text", "nothing")
            props.rowActions.onBeginMoveActivityGroup(props.activitySummary)
        }

        let onDragEnd = (evt: React.DragEvent<HTMLDivElement>) => {
            evt.dataTransfer.dropEffect = "move"
            props.rowActions.onEndMoveActivityGroup()
        }

        let dragHandleElement : JSX.Element = <span>&#8942;&#8942;</span>

        if (!props.activitySummary.tracksPollResponseText) {
            dragHandleElement = <Icon type="folder" />
        }

        dragHandle = <Tooltip title="Move" placement="top" visible={false}>
            <div className="dragHandle enabled" 
                          draggable={true} 
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}>
                 { dragHandleElement }
            </div>
        </Tooltip>
    } else {
        dragHandle = <div className="dragHandle"></div>
    }
    
    return dragHandle
}