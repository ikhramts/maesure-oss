import * as React from 'react'

export function makeSpacers(depth: number) : JSX.Element[] {
    let spacers = []

    for (let i = 0; i < depth; i++) {
        spacers.push(<div className="spacer" key={"spacer-" + i}></div>)
    }

    return spacers
}
