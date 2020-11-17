import * as React from 'react'

export interface LeftActionIconProps {
    onClick: () => void
}

export function LeftActionIcon(props: LeftActionIconProps) {
    let onClick = (evt: any) => {
        evt.preventDefault()
        props.onClick()
    }

    return <a href="" className="actionIcon chevron" onClick={onClick}>
        <i className="statusIcon fa fas fa-chevron-left"></i>
    </a> 
}