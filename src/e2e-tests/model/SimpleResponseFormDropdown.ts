import { ElementHandle, Page } from 'puppeteer'
import { getText, isVisible } from './helpers'

export class SimpleResponseFormDropdown {
    constructor(page: Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('div.ant-select-dropdown', {visible: true})
    }

    async isPresent() : Promise<boolean> {
        return isVisible(this._page, 'div.ant-select-dropdown')
    }

    async entry(num: number) : Promise<ElementHandle<Element>> {
        const dropdown = await this.waitForPresent()
        const entries = await dropdown.$$('li.ant-select-dropdown-menu-item')

        if (entries.length < num) {
            throw `There is no dropdown entry number ${num}. There are ${entries.length} entries.`
        }

        return entries[num - 1]
    }

    async clickEntry(num: number) : Promise<void> {
        const entry = await this.entry(num)
        await entry.click()
    }

    async entryText(num: number) : Promise<string> {
        const entry = await this.entry(num)
        return getText(this._page, entry)
    }

    async numEntries() : Promise<number> {
        const dropdown = await this.waitForPresent()
        const entries = await dropdown.$$('li.ant-select-dropdown-menu-item')
        return entries.length
    }

    // ================ Private ====================
    private _page : Page
}