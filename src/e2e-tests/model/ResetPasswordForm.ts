import * as puppeteer from 'puppeteer'
import { ElementHandle } from 'puppeteer'

export class ResetPasswordForm {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#reset-password-form')
    }

    async emailInput() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#reset-password-email')
    }

    async enterEmail(email: string) : Promise<void> {
        const input = await this.emailInput()
        await input.type(email, {delay: 100})
    }

    async clickRequestPasswordReset() : Promise<void> {
        const button = await this._page.waitForSelector('#reset-password-form button[type=submit]')
        await button.click()
    }

    async waitForResetPasswordResult() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#reset-password-result')
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}