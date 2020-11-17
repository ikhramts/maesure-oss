import * as puppeteer from 'puppeteer'
import { ElementHandle } from 'puppeteer'
import { waitForSubElementByText } from './helpers'

export class NotificationPermissionRequest {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return await this._page.waitForSelector('div.notificationsPermissionRequest')
    }

    async clickYes() : Promise<void> {
        const permissionRequest = await this.waitForPresent()
        const yes = await waitForSubElementByText(permissionRequest, 'a', 'Yes')
        yes.click()
    }

    async clickNo() : Promise<void> {
        const permissionRequest = await this.waitForPresent()
        const no = await waitForSubElementByText(permissionRequest, 'a', 'No')
        no.click()
    }


    // ================ Private ====================
    private _page : puppeteer.Page
}