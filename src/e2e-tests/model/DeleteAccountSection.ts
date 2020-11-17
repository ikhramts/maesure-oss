import { ElementHandle, Page } from 'puppeteer'

export class DeleteAccountSection {
    constructor(page: Page) {
        this._page = page
    }

    async waitForDeleteAccountButton() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#deleteAccount_startButton')
    }

    async clickDeleteAccountButton() : Promise<void> {
        const button = await this.waitForDeleteAccountButton()
        await button.click()
    }

    async isDeleteAccoutButtonVisible() : Promise<boolean> {
        const button = this._page.$('#deleteAccount_startButton')
        return button != null
    }

    async waitForDeleteAccountForm() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('.deleteAccountForm')
    }

    async isDeleteAccountFormVisible() : Promise<boolean> {
        const form = this._page.$('.deleteAccountForm')
        return form != null
    }

    async enterConfirmDeleteText(text: string) : Promise<void> {
        this._page.waitForSelector('#deleteAccount_confirmInput')
        this._page.type('#deleteAccount_confirmInput', text, {delay: 150})
    }

    async waitForConfirmDeleteButton() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#deleteAccount_confirmButton')
    }

    async waitForConfirmDeleteEnabled() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#deleteAccount_confirmButton:not([disabled])')
    }

    async waitForConfirmDeleteDisabled() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#deleteAccount_confirmButton[disabled]')
    }

    async clickConfirmDeleteButton() : Promise<void> {
        const button = await this.waitForConfirmDeleteEnabled()
        await button.click()
    }

    async clickCancel() : Promise<void> {
        const button = await this._page.waitForSelector('#deleteAccount_cancelButton')
        await button.click()
    }

    // ================ Private ====================
    private _page : Page
}