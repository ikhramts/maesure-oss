import * as puppeteer from 'puppeteer'
import { MAESURE_BASE_URL, RUN_BROWSER_HEADLESS } from 'e2e/utils/test-environment'
import { NavBar } from './NavBar'
import { TimeTrackerWidget } from './TimeTrackerWidget'
import { ResultsSection } from './ResultsSection'
import { NotificationPermissionRequest } from './NotificationPermissionRequest'
import { ConfirmModal } from './ConfirmModal'
import { Browser, Page } from 'puppeteer'
import { CreateAccountForm } from './CreateAccountForm'
import { AccountSettingsPage } from './AccountSettingsPage'
import { ResetPasswordForm } from './ResetPasswordForm'

export class MaesurePage {

    private constructor(browser: puppeteer.Browser, page: puppeteer.Page) {
        this._browser = browser
        this._page = page
    }

    // ================ Basic operations ===================== //
    browser() : Browser {
        return this._browser
    }

    page() : Page {
        return this._page
    }

    async close() : Promise<void> {
        await this._browser.close();
    }

    static async open(options?: puppeteer.LaunchOptions) : Promise<MaesurePage> {
        const launchOptions : puppeteer.LaunchOptions = {
            headless: RUN_BROWSER_HEADLESS, 
            defaultViewport: {width: 1024, height: 768}
        }
        
        if (options) {
            Object.assign(launchOptions, options)
        }
        
        const browser = await puppeteer.launch(launchOptions)
        const page = await browser.newPage()
        const maesurePage = new MaesurePage(browser, page);

        await maesurePage.goto(MAESURE_BASE_URL)
        return maesurePage
    }

    // ================ Page operations ===================== //
    async goto(url: string): Promise<void> {
        await this._page.goto(url)
    }

    async gotoMaesureUrl(url?: string) : Promise<void>  {
        if (url) {
            await this._page.goto(MAESURE_BASE_URL + url)
        } else {
            await this._page.goto(MAESURE_BASE_URL)
        }
    }

    async screenshot(filename?: string) : Promise<void> {
        if (!filename) {
            await this._page.screenshot({path: `test-results/screenshot.png`})
        } else {
            await this._page.screenshot({path: `test-results/${filename}.png`})
        }
    }

    async waitForNavigation() : Promise<void> {
        await this._page.waitForNavigation({waitUntil: 'domcontentloaded'})
    }

    // ================ Maesure site model ===================== //
    accountSettingsPage() : AccountSettingsPage {
        return new AccountSettingsPage(this._page)
    }

    confirmModal() : ConfirmModal {
        return new ConfirmModal(this._page)
    }

    createAccountForm() : CreateAccountForm {
        return new CreateAccountForm(this._page)
    }

    navBar() : NavBar {
        return new NavBar(this._page)
    }

    notificationPermissionRequest() : NotificationPermissionRequest {
        return new NotificationPermissionRequest(this._page)
    }

    resetPasswordForm() : ResetPasswordForm {
        return new ResetPasswordForm(this._page)
    }

    resultsSection() : ResultsSection {
        return new ResultsSection(this._page)
    }

    timeTrackerWidget() : TimeTrackerWidget {
        return new TimeTrackerWidget(this._page)
    }

    // ============== Private ================
    private _browser : puppeteer.Browser
    private _page : puppeteer.Page

}