import * as React from 'react'

export class CrispLoader extends React.Component<{},{}> {
    componentDidMount() {
        // Start loading Crisp. 
        // Per https://help.crisp.chat/en/article/how-to-use-crisp-with-reactjs-fe0eyz/
        // Include the Crisp code here, without the <script></script> tags
        const window_ = window as any;

        if (window_.$crisp) {
            // We have already loaded Crisp.
            return
        }
        
        window_.$crisp = [];
        window_.CRISP_WEBSITE_ID = "e998d60c-f27f-47c7-8635-e1a6718a4c13";

        (function() {
            var d = document;
            var s = d.createElement("script");

            s.src = "https://client.crisp.chat/l.js";
            s.async = true;
            d.getElementsByTagName("head")[0].appendChild(s);
        })();

        // Automatically add user's email.
        // fetchCurrentUser()
        //     .then(user => {
        //         if (user.email) {
        //             window_.$crisp.push(["set", "user:email", [user.email]])
        //         }
        //     })
    }
    
    render() {
        // Crisp will render itself.
        return null
    }
}