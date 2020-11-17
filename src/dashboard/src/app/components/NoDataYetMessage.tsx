import * as React from 'react'

export interface NoDataYetmessageProps {
    show: boolean
}

export function NoDataYetMessage(props: NoDataYetmessageProps) {
    if (!props.show)
        return null

    return <p className="noDataYet" style={{marginTop: 20}}>
        You don't have any data for these days.
    </p>
}