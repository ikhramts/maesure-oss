import * as React from 'react'

export interface ExpandToggleProps {
    onClick: () => void
    empty?: boolean
    expanded?: boolean
}

export function ExpandToggle(props: ExpandToggleProps) {
    if (props.empty) {
        return <div className="expandToggle"></div>
    }

    let onClick = (evt: any) => {
        evt.preventDefault()
        props.onClick()
    }

    let icon = props.expanded ? "fa-angle-down" : "fa-angle-right"
    let className = "fa fas " + icon
    return <div className="expandToggle">
        <a href="" onClick={onClick} className="actionIcon">
            <i className={className}></i>
        </a>
    </div>
}