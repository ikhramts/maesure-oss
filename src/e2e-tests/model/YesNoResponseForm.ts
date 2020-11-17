import { ElementHandle, Page } from 'puppeteer'
import { getText } from './helpers'

export class YesNoResponseForm {
    constructor(page: Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('div.yesNoInput')
    }

    async clickYesButton() : Promise<void> {
        const button = await this._page.waitForSelector('#timeTrackerWidget_yesNoInput_yes')
        await button.click()
    }

    async clickNoButton() : Promise<void> {
        const button = await this._page.waitForSelector('#timeTrackerWidget_yesNoInput_no')
        await button.click()
    }

    async questionText() : Promise<string> {
        const p = await this._page.waitForSelector('#timeTrackerWidget_yesNoInput_question')
        return getText(this._page, p)
    }

    // ================ Private ====================
    private _page : Page
}