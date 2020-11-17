import { Page } from 'puppeteer'
import { DeleteAccountSection } from './DeleteAccountSection'

export class AccountSettingsPage {
    constructor(page: Page) {
        this._page = page
    }

    deleteAccountSection() : DeleteAccountSection {
        return new DeleteAccountSection(this._page)
    }

    // ================ Private ====================
    private _page : Page
}