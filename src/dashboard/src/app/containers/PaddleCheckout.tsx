import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy';
import { Icon } from 'antd';

const PADDLE_VENDOR_ID = 108625

export interface PaddleCheckoutProps {
    timeTracker: TimeTrackerProxy
    action: CheckoutAction
    onCheckoutComplete: () => void
}

export enum CheckoutAction {
    BUY_PRO,
    UPDATE_PAYMENT
}

export interface PaddleCheckoutState {
    scriptLoading: boolean
    payLinkLoading: boolean
    checkoutLink: string | null
    hasError: boolean,
    checkoutLoading: boolean,
}

export class PaddleCheckout 
extends React.Component<PaddleCheckoutProps, PaddleCheckoutState> {
    constructor(props: PaddleCheckoutProps) {
        super(props)

        this.checkForPaddleLoaded = this.checkForPaddleLoaded.bind(this)
        this.onCheckoutLinkError = this.onCheckoutLinkError.bind(this)
        this.onCheckoutLinkLoaded = this.onCheckoutLinkLoaded.bind(this)
        this.tryShowPaddle = this.tryShowPaddle.bind(this)
        this.onPaddleEvent = this.onPaddleEvent.bind(this)

        this.state = {
            scriptLoading: true,
            payLinkLoading: true,
            checkoutLink: null,
            hasError: false,
            checkoutLoading: true,
        }
    }

    componentDidMount() {
        const anyWindow = window as any;

        // Load Paddle library from Paddle CDN
        // https://paddle.com/docs/paddle-checkout-web/
        if (!anyWindow.Paddle) {
            // Load Paddle.
            const scriptElt = document.createElement('script')
            scriptElt.async = true
            scriptElt.src = "https://cdn.paddle.com/paddle/paddle.js"
            document.getElementsByTagName('head')[0].appendChild(scriptElt)
            this.checkForPaddleLoaded()
        
        } else {
            this.setState({scriptLoading: false})
        }

        // Load Paddle pay link. We'll later pass it to Paddle.
        const apiClient = this.props.timeTracker.apiClient
        const action = this.props.action

        if (action == CheckoutAction.BUY_PRO) {
            apiClient.fetchPaddlePayLink()
                .then(this.onCheckoutLinkLoaded)
        
        } else if (action == CheckoutAction.UPDATE_PAYMENT) {
            apiClient.fetchPaddleUpdateUrl()
                .then(this.onCheckoutLinkLoaded)
        }
    }

    componentWillUnmount() {
        this._unmounted = true
    }
    
    render() {
        const state = this.state
        let paddleLoadingNotice : JSX.Element | null = null

        if (state.hasError) {
            return <div className="paddleCheckout">
                <div className="notice">
                    Something went wrong. Please try again later.
                </div>
            </div>
        }

        if (state.checkoutLoading) {
            paddleLoadingNotice = <div className="paddleLoading notice">
                <Icon type="loading"/> Hang on...
            </div>
        }

        return <div className="paddleCheckout">
            { paddleLoadingNotice }
            <div className="paddleContainer">
            </div>
        </div>
    }

    // =================== Private =====================
    private _unmounted = false

    private checkForPaddleLoaded() {
        const paddle = (window as any).Paddle

        if (paddle) {
            paddle.Setup({ 
                vendor: PADDLE_VENDOR_ID,
                eventCallback: this.onPaddleEvent
            })
            this.setState({scriptLoading: false}, this.tryShowPaddle)
            
        } else {
            setTimeout(this.checkForPaddleLoaded, 20)
        }
    }

    private onCheckoutLinkError() {
        if (this._unmounted) {
            return
        }

        this.setState({
            payLinkLoading: false,
            hasError: true
        })
    }

    private onCheckoutLinkLoaded(link: string) {
        if (this._unmounted) {
            return
        }

        this.setState({
            payLinkLoading: false,
            checkoutLink: link
        }, this.tryShowPaddle)
    }

    private tryShowPaddle() {
        if (this._unmounted) {
            return
        }

        const state = this.state
        if (state.scriptLoading || state.payLinkLoading || state.hasError) {
            return
        }

        const link = this.state.checkoutLink
        const paddle = (window as any).Paddle
        paddle.Checkout.open({
            override: link,
            method: 'inline',
            frameTarget: 'paddleContainer', // The className of your checkout <div>
            frameInitialHeight: 366,
            frameStyle: 'width:400px; background-color: transparent; border: none;',
        })

    }

    private onPaddleEvent(evt: any) {
        if (evt.event == "Checkout.Complete") {
            // 1. Show the user a "processing" notice
            // 2. Start polling /api/current-user until we get "Pro" account type
            // 3. Show success message with "go to Maesure" button
            //      - that one should do hard reload
            this.props.onCheckoutComplete()
        
        } else if (evt.event == "Checkout.Loaded") {
            this.setState({checkoutLoading: false})
        }
    }

}