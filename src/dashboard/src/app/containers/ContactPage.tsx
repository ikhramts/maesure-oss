import * as React from 'react'

export class ContactPage extends React.Component<{}, {}> {
    render() {
        const window_ = window as any

        let contactViaChat : JSX.Element | null = null

        if (window_.$crisp) {
            const openChat = (evt: any) => {
                evt.preventDefault()
                window_.$crisp.push(['do', 'chat:open'])
            }
            
            contactViaChat = <li><strong>Chat:</strong> <a href="" onClick={openChat}>Open chat</a></li>
        }

        return <div className="page mostlyText">
            <h1>Contact me</h1>
            <p>
                Problems? Comments? Ideas? 
            </p>
            <ul>
                <li><strong>Email:</strong> <a href="mailto:iouri.khramtsov@maesure.com">iouri.khramtsov@maesure.com</a></li>
                { contactViaChat }
            </ul>
        </div>
    }
}