import * as puppeteer from 'puppeteer'
import { ElementHandle } from 'puppeteer'

export class CreateAccountForm {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#createAccountForm')
    }

    async clickContinueWithGoogle() : Promise<void> {
        const continueWithGoogle = await this._page.waitForSelector('#btn-google')
        await continueWithGoogle.click()
    }

    async emailInput() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#sign-up-email')
    }

    async passwordInput() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#sign-up-password')
    }

    async enterEmail(email: string) : Promise<void> {
        const input = await this.emailInput()
        await input.type(email)
    }

    async enterPassword(password: string) : Promise<void> {
        const input = await this.passwordInput()
        await input.type(password)
    }

    async clickConfirmTermsAndConditions() {
        const checkbox = await this._page.waitForSelector('#sign-up-confirm-tc')
        await checkbox.click()
    }

    async clickCreateAccount() : Promise<void> {
        const button = await this._page.waitForSelector('#btn-signup')
        await button.click()
    }

    async waitForEmailIsGoodMessage() : Promise<ElementHandle<Element> | null> {
        try {
            const element = await this._page.waitForSelector('#sign-up-email-group .success', {visible: true, timeout: 10 * 1000})
            return element
        } catch {
            return null
        }
    }

    async waitForEmailIsBadMessage() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#sign-up-email-group .error', {visible: true, timeout: 10 * 1000})
    }

    async waitForPasswordIsBadMessage() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#sign-up-password-group .error', {visible: true, timeout: 10 * 1000})
    }

    async waitForConfirmTermsAndConditionsIsBadMessage() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#sign-up-confirm-tc-group .error', {visible: true, timeout: 10 * 1000})
    }

    async resetPasswordLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#reset-password-link')
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}