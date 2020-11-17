import * as puppeteer from 'puppeteer'
import { ElementHandle } from 'puppeteer'

export class ConfirmModal {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('div.ant-modal-wrap')
    }

    async okButton() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('div.ant-modal-wrap button.ant-btn-danger')
    }

    async cancelButton() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('div.ant-modal-wrap button:not(.ant-btn-danger)')
    }

    async clickOk() : Promise<void> {
        const okButton = await this.okButton()
        return okButton.click()
    }

    async clickCancel() : Promise<void> {
        const cancelButton = await this.cancelButton()
        return cancelButton.click()
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}