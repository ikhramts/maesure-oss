import * as puppeteer from 'puppeteer'
import { getText } from './helpers'

export class SummaryTableActivity {
    constructor(page: puppeteer.Page, row: number) {
        this._page = page
        this._rowNumber = row
    }

    async waitForPresent() : Promise<void> {
        await this._page.waitForSelector('div.timeTrackerResults')
    }

    async name() : Promise<string> {
        const summaryTable = await this._page.waitForSelector('table.summaryTable')
        const activityNameCells = await summaryTable.$$('td.activityName')
        
        if (activityNameCells.length < this._rowNumber) {
            throw "Summary table does not have row " + this._rowNumber
        }

        const activityNameCell = activityNameCells[this._rowNumber - 1]
        const cellContents = await activityNameCell.$('.cellContents')

        if (cellContents == null) {
            throw 'Could not find a div.cellContents element in activityName cell'
        }

        return getText(this._page, cellContents)
    }

    async clickMakeSubfolder() {

    }

    async clickMove() {

    }

    async clickDelete() {

    }

    // ================ Private ====================
    private _page : puppeteer.Page
    private _rowNumber: number
}