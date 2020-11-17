import * as React from 'react'
import { SignUpRequest } from 'shared/api/SignUpRequest';
import { signUp } from 'shared/api/userActions';

export enum CheckingEmailState {
    NotStarted,
    Checking,
    GoodToGo,
    InUse,
    NotAnEmail
}

export interface CreateAccountPageState {
    email: string,
    password: string,
    hasConfirmedTermsAndConditions: boolean,
    hasConfirmedTermsAndConditionsWithGoogle: boolean,

    checkingEmailState : CheckingEmailState
    passwordHasError : boolean
    termsAndConditionsHasError : boolean
    termsAndConditionsWithGoogleHasError : boolean

    isSubmitting : boolean
}

export class CreateAccountPage extends React.Component<{}, CreateAccountPageState> {
    constructor(props: {}) {
        super(props)

        this.checkEmail = this.checkEmail.bind(this)
        this.checkPassword = this.checkPassword.bind(this)
        this.checkTermsAndConditions = this.checkTermsAndConditions.bind(this)

        this.updateEmail = this.updateEmail.bind(this)
        this.updatePassword = this.updatePassword.bind(this)
        this.updateAgreedToTerms = this.updateAgreedToTerms.bind(this)
        this.updateAgreedToTermsWithGoogle = this.updateAgreedToTermsWithGoogle.bind(this)
        this.submit = this.submit.bind(this)
        this.checkTermsAndConditionsForGoogle = this.checkTermsAndConditionsForGoogle.bind(this)

        this.state = {
            email: "",
            password: "",
            hasConfirmedTermsAndConditions: false,
            hasConfirmedTermsAndConditionsWithGoogle: false,

            checkingEmailState: CheckingEmailState.NotStarted,
            passwordHasError: false,
            termsAndConditionsHasError: false,
            termsAndConditionsWithGoogleHasError: false,

            isSubmitting: false
        }
    }

    componentDidMount() {
        window.scrollTo(0, 0)
    }

    render() {
        // Email validation message
        let emailValidationMessage : JSX.Element | null = null
        const checkingEmailState = this.state.checkingEmailState
        let emailGroupClass = 'formGroup'

        if (checkingEmailState == CheckingEmailState.Checking) {
            emailValidationMessage = <p className="validation processing">Checking the email...</p>
        
        } else if (checkingEmailState == CheckingEmailState.InUse) {
            emailValidationMessage = <p className="validation error">This email is already in use. <a href="/reset-password" id="reset-password-link">Forgot your password</a>?</p>
            emailGroupClass += ' validation-error'

        } else if (checkingEmailState == CheckingEmailState.NotAnEmail) {
            emailValidationMessage = <p className="validation error">That is not an email.</p>
            emailGroupClass += ' validation-error'

        } else if (checkingEmailState == CheckingEmailState.GoodToGo) {
            emailValidationMessage = <p className="validation success">Good to go!</p>
        
        } 

        // Password validation message
        let passwordValidationMessage : JSX.Element | null = null
        let passwordGroupClass = 'formGroup'

        if (this.state.passwordHasError) {
            passwordValidationMessage = <p className="validation error">The password should be at least 8 characters.</p> 
            passwordGroupClass += ' validation-error'
        }

        // Terms and Conditions validation message
        let termsAndConditionsValidationMessage : JSX.Element | null = null

        if (this.state.termsAndConditionsHasError) {
            termsAndConditionsValidationMessage = 
                <p className="validation error terms-and-conditions">
                    You have to read and agree with these.
                </p> 
        }

        let termsAndConditionsWithGoogleValidationMessage : JSX.Element | null = null

        if (this.state.termsAndConditionsWithGoogleHasError) {
            termsAndConditionsWithGoogleValidationMessage = 
                <p className="validation error terms-and-conditions">
                    You have to read and agree with these.
                </p> 
        }

        // Render the submit button
        let submitButton : JSX.Element

        if (!this.state.isSubmitting) {
            submitButton = <button type="submit" id="btn-signup" className="btn-primary form-show-default">Sign up</button>
        
        } else {
            submitButton = <button type="submit" id="btn-signup" className="btn-primary form-show-submitting" disabled={true}>Submitting...</button>
        }

        return <div className="createAccount">
            <form id="createAccountForm" className="wizardForm" onSubmit={this.submit}>
                <h2>Create account</h2>
                <p className="textAlignCenter">
                    <a href="/api/auth/login-with-google"
                        onClick={this.checkTermsAndConditionsForGoogle}
                        id="btn-google"
                        className="button btn-google">
                        Continue with Google
                    </a>
                </p>
                <div className="formGroup" id="sign-up-confirm-tc-group-google">
                    <input type="checkbox" 
                        name="confirm_tc_google" id="sign-up-confirm-tc-google" 
                        checked={this.state.hasConfirmedTermsAndConditionsWithGoogle} 
                        onChange={this.updateAgreedToTermsWithGoogle}/>
                    <label htmlFor="sign-up-confirm-tc-google">
                        I've read and and agreed to 
                        the <a href="/terms-and-conditions">terms and conditions</a> and
                        the <a href="/privacy-policy">privacy policy</a>.
                    </label>
                    { termsAndConditionsWithGoogleValidationMessage }
                </div>

                <p className="horizontalLine"><span>Or</span></p>

                <div className={emailGroupClass} id="sign-up-email-group">
                    <label htmlFor="sign-up-email">Your email</label>
                    <input type="text" name="email" id="sign-up-email" value={this.state.email} onChange={this.updateEmail} onBlur={this.checkEmail}/>
                    { emailValidationMessage }
                </div>
                <div className={passwordGroupClass} id="sign-up-password-group">
                    <label htmlFor="sign-up-password">Password (at least 8 characters)</label>
                    <input type="password" name="password" id="sign-up-password" value={this.state.password}  onChange={this.updatePassword}  onBlur={this.checkPassword}/><br/>
                    { passwordValidationMessage }
                </div>
                <div className="formGroup" id="sign-up-confirm-tc-group">
                    <input type="checkbox" name="confirm_tc" id="sign-up-confirm-tc" checked={this.state.hasConfirmedTermsAndConditions} onChange={this.updateAgreedToTerms}/>
                    <label htmlFor="sign-up-confirm-tc">I've read and and agreed to the <a href="/terms-and-conditions">terms and conditions</a> and
                        the <a href="/privacy-policy">privacy policy</a>.
                    </label>
                    { termsAndConditionsValidationMessage }
                </div>
                { submitButton }
            </form>
        </div>
    }

    // =================== Private =====================
    private checkEmail() : Promise<void> {
        const email = this.state.email
    
        if (!email || email.length < 3 || email.indexOf('@') == -1) {
            this.setState({checkingEmailState: CheckingEmailState.NotAnEmail})
            return Promise.resolve()
        }

        this.setState({checkingEmailState: CheckingEmailState.Checking})

        return new Promise((resolve) => {
            fetch('/api/signup/is-email-available/' + email, { headers: { 'Cache-Control': 'no-cache'}})
                .then(reply => {
                    let state: CheckingEmailState

                    if (reply.ok) {
                        state = CheckingEmailState.GoodToGo
                    } else {
                        state = CheckingEmailState.InUse
                    }

                    this.setState({checkingEmailState: state}, () => resolve())
                })
        });
    }

    private checkPassword() : boolean {
        const passwordHasError = !this.state.password || this.state.password.length < 8
        this.setState({passwordHasError: passwordHasError})
        return !passwordHasError
    }

    private checkTermsAndConditions(): boolean {
        this.setState({termsAndConditionsHasError: !this.state.hasConfirmedTermsAndConditions})
        return this.state.hasConfirmedTermsAndConditions
    }

    private updateEmail(evt: any) {
        this.setState({email: evt.target.value})
    }

    private updatePassword(evt: any) {
        this.setState({password: evt.target.value})
    }

    private updateAgreedToTerms(evt: any) {
        this.setState({hasConfirmedTermsAndConditions: evt.target.checked})
    }

    private updateAgreedToTermsWithGoogle(evt: any) {
        this.setState({
            hasConfirmedTermsAndConditionsWithGoogle: evt.target.checked,
            termsAndConditionsWithGoogleHasError: false
        })
    }

    private submit(evt:any) {
        evt.preventDefault()

        // Validate.
        const passwordIsValid = this.checkPassword()
        const termsAndConditionsAreValid = this.checkTermsAndConditions()

        this.checkEmail().then(() => {
            const emailIsValid = this.state.checkingEmailState == CheckingEmailState.GoodToGo

            if (!emailIsValid || !passwordIsValid || !termsAndConditionsAreValid) {
                return false
            }

            // Validation done.
            // Update the visual state.
            this.setState({isSubmitting: true})

            // Submit the form.
            const request = new SignUpRequest({
                email: this.state.email,
                password: this.state.password,
                hasConfirmedTermsAndConditions: this.state.hasConfirmedTermsAndConditions
            })

            signUp(request)
                .catch(() => {
                    this.setState({isSubmitting: false})
                    window.alert("There was an error. Please try again in a few minutes.")
                })                
                .then(() => {
                        window.location.replace("/")
                    })

            return false
        })
    }

    private checkTermsAndConditionsForGoogle(evt: any) {
        const checkedTerms = this.state.hasConfirmedTermsAndConditionsWithGoogle

        if (!checkedTerms) {
            // Ask the user to accept the terms and conditions
            evt.preventDefault()
            this.setState({
                termsAndConditionsWithGoogleHasError: true
            })
        }

        // Else: no problem, allow the default browser behavior.
    }
}