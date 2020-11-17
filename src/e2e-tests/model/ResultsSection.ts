import * as puppeteer from 'puppeteer'
import { SummaryTable } from './SummaryTable'
import { ElementHandle } from 'puppeteer'
import { waitFor } from './helpers'
import { HistoryTable } from './HistoryTable'

export class ResultsSection {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<void> {
        await this._page.waitForSelector('div.timeTrackerResults')
    }

    summaryTable() : SummaryTable {
        return new SummaryTable(this._page)
    }

    historyTable() : HistoryTable {
        return new HistoryTable(this._page)
    }

    async waitForAdForPermanentAccount() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('div.adForPermanentAccount')
    }

    async linkToSummary() : Promise<ElementHandle<Element>> {
        return await waitFor(async () => {
            const resultsNav = await this._page.waitForSelector('.resultsHeaderNav')
            return resultsNav.$('#timeTrackerResults_reportsNavLink')
        }, `Could not find #timeTrackerResults_reportsNavLink`)
    }

    async linkToHistory() : Promise<ElementHandle<Element>> {
        return await waitFor(async () => {
            const resultsNav = await this._page.waitForSelector('.resultsHeaderNav')
            return resultsNav.$('#timeTrackerResults_editEntriesNavLink')
        }, `Could not find #timeTrackerResults_editEntriesNavLink`)
    }

    async clickLinkToSummary() : Promise<void> {
        const link = await this.linkToSummary()
        await link.click()
    }

    async clickLinkToHistory() : Promise<void> {
        const link = await this.linkToHistory()
        await link.click()
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}