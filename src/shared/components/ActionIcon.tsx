import * as React from 'react'
import { Tooltip, Icon } from 'antd';

export interface ActionIconProps {
    type: string,
    onClick?: () => void
    danger?: boolean
    toolTip?: string
    className?: string
}

export function ActionIcon(props: ActionIconProps) {
    let onClick = (evt: any) => {
        evt.preventDefault()
        props.onClick!!()
    }

    if (props.type == "spacer") {
        return <span className="actionIcon spacer"></span>
    }

    let className = props.danger ? "actionIcon danger" : "actionIcon"
    if (props.className) {
        className += " " + props.className
    }

    if (props.toolTip) {
        return <a href="" className={className} onClick={onClick}>
            <Tooltip title={props.toolTip} placement="top">
                <Icon type={props.type}/>
            </Tooltip>
        </a> 

    } else {
        return <a href="" className={className} onClick={onClick}>
            <Icon type={props.type}/>
        </a> 
    }
}