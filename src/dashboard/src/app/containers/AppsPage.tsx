import * as React from 'react'
import { Collapse } from 'antd'

export class AppsPage extends React.Component<{}, {}> {
    render() {
        return <div className="page mostlyText appsPage">
            <h1>Maesure without the browser</h1>
            <div className="downloadsRow">
                <a href="https://static.maesure.com/downloads/stable/Maesure-setup.exe" className="downloadButton windows">
                    <span>Windows/x64 - download</span>
                    <img className="winLogo" src="/windows-logo.svg" alt="Windows logo"/>
                </a>
            </div>
            <h2>You may see a warning</h2>
            <p>
                Your operating system may try to block the setup. This happens because 
                Maesure has not acquired enough <a href="https://security.stackexchange.com/questions/139347" target="_blank">reputation</a> with 
                Microsoft SmartScreen. <img className="preloadImage" src="/smart-screen-1.png"/> <img className="preloadImage" src="/smart-screen-2.png"/>
            </p>

            <Collapse bordered={false}>
                <Collapse.Panel header="What the warning looks like" key="1">
                    <p>
                        <img src="/smart-screen-1.png" style={{maxWidth: "400px", padding: "0 10px 10px 0"}}/>
                        <img src="/smart-screen-2.png" style={{maxWidth: "400px", padding: "0 10px 10px 0"}}/>
                    </p>
                </Collapse.Panel>
            </Collapse>
        </div>
    }
}