import * as React from 'react'
import { sendPost } from 'shared/api/restActions';

export enum ResetPasswordFormState {
    NotStarted, Submitting, Submitted, EmailError, SubmitFailed
}

export interface ResetPasswordPageState {
    formState: ResetPasswordFormState
    email: string
}

export class ResetPasswordPage extends React.Component<{}, ResetPasswordPageState> {
    constructor(props: {}) {
        super(props)

        this.submitForm = this.submitForm.bind(this)

        this.state = {
            formState: ResetPasswordFormState.NotStarted,
            email: ""
        }
    }

    render() {
        const onEmailChanged = (evt: any) => {
            this.setState({email: evt.target.value})
        }

        const formState = this.state.formState

        // Compose the validation error.
        let emailError : JSX.Element | null = null

        if (formState == ResetPasswordFormState.EmailError) {
            emailError = <p className="validation error">That does not look like an email.</p> 
        }

        // Compose the submit button.
        let submitButton : JSX.Element = <button type="submit" className="btn-primary form-show-default">Request password reset</button>

        if (formState == ResetPasswordFormState.Submitting) {
            submitButton = <button type="submit" className="btn-primary form-show-submitting" disabled={true}>Submitting...</button>
        }

        // Compose the result message.
        let resultMessage : JSX.Element | null = null

        if (formState == ResetPasswordFormState.Submitted) {
            resultMessage = <p id="reset-password-result" className="formResult">We have sent the password reset instructions (if you have an account with us).</p>
        
        } else if (formState == ResetPasswordFormState.SubmitFailed) {
            resultMessage = <p id="reset-password-result" className="formResult validation error">Could not submit the request. Please try again in a few minutes.</p>
        }

        return <form id="reset-password-form" className="wizardForm" onSubmit={this.submitForm}>
            <h2>Reset the password</h2>
            <p>Enter your email and we will send you instructions to reset your password.</p>
            <div className="formGroup" id="reset-password-email-group">
                <label htmlFor="reset-password-email">Your email</label>
                <input type="text" name="email" id="reset-password-email" value={this.state.email} onChange={onEmailChanged}/>
                { emailError }
            </div>
            { submitButton }
            { resultMessage }
        </form>
    }

    // ========================== Private ===============================
    private submitForm(evt: any) {
        evt.preventDefault()

        // Check whether the email is valid.
        const email = this.state.email

        if (!email || email.length < 5 || email.indexOf(".") == -1 || email.indexOf('@') == -1) {
            this.setState({formState: ResetPasswordFormState.EmailError})
            return false
        }

        this.setState({formState: ResetPasswordFormState.Submitting})

        sendPost('/api/account/send-change-password-email/' + email)
            .catch(() => this.setState({formState: ResetPasswordFormState.SubmitFailed}))
            .then(() => this.setState({formState: ResetPasswordFormState.Submitted}))

        return false
    }

}