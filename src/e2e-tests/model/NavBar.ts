import * as puppeteer from 'puppeteer'
import { ElementHandle } from 'puppeteer'
import { getSubElementWithText, waitFor, getText } from './helpers'

export class NavBar {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('nav.mainNav')
    }

    async waitForNavLink(text: string) : Promise<ElementHandle<Element>> {
        return await waitFor(async () => {
            const mainNav = await this.waitForPresent()
            return await getSubElementWithText(mainNav, 'a', text, 'nav link')
        }, `Could not find a nav link with text '${text}'`)
    }

    async shouldNotHaveLink(text: string) {
        const mainNav = await this.waitForPresent()
        const navLink = await getSubElementWithText(mainNav, 'a', text, 'nav link')

        if (navLink) {
            throw `Nav link with text '${text}' was not supposed to be present`
        }
    }

    async waitForAccountMenuLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#headerNavBar_accountMenu')
    }

    async clickAccountMenuLink() : Promise<void> {
        const accountMenuLink = await this.waitForAccountMenuLink()
        await accountMenuLink.click()
    }

    async accountNameText() : Promise<string> {
        const accountMenuTextElt = await this._page.waitForSelector('#headerNavBar_accountName')
        return getText(this._page, accountMenuTextElt)
    }

    async clickAccountSettings() : Promise<void> {
        const link = await this._page.waitForSelector('#headerNavBar_accountMenu_accountSettings')
        await link.click()
    }

    async clickLogout() : Promise<void> {
        const link = await this._page.waitForSelector('#headerNavBar_accountMenu_logout')
        await link.click()
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}