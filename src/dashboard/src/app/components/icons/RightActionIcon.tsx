import * as React from 'react'

export interface RightActionIconProps {
    onClick: () => void
}

export function RightActionIcon(props: RightActionIconProps) {
    let onClick = (evt: any) => {
        evt.preventDefault()
        props.onClick()
    }

    return <a href="" className="actionIcon chevron" onClick={onClick}>
        <i className="statusIcon fa fas fa-chevron-right"></i>
    </a> 
}