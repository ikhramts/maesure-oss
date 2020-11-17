import * as puppeteer from 'puppeteer'
import { getText } from './helpers'
import { SummaryTableActivity } from './SummaryTableActivity'

export class SummaryTable {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<puppeteer.ElementHandle<Element>> {
        return this._page.waitForSelector('table.summaryTable')
    }

    async summaryColumnHeaderText(column: number) : Promise<string> {
        const table = await this.waitForPresent()
        const summaryColumnHeaders = await table.$$('th.summaryColumn')

        if (summaryColumnHeaders.length < column) {
            throw `There is no summary column header number ${column}. There are ${summaryColumnHeaders.length} summary column headers.`
        }

        const header = summaryColumnHeaders[column - 1]
        return getText(this._page, header)
    }

    async summaryCellText(row: number, column: number) {
        const table = await this.waitForPresent()
        const tbody = await table.$('tbody')
        const summaryRows = await tbody!!.$$('tr')

        if (summaryRows.length < row) {
            throw `There is no summary table row ${row}. There are ${summaryRows.length} rows.`
        }

        const summaryRow = summaryRows[row - 1]
        const summaryCells = await summaryRow.$$('td.summaryColumn')

        if (summaryCells.length < column) {
            throw `There is no summary table row ${column}. There are ${summaryCells.length} rows.`
        }

        const summaryCell = summaryCells[column - 1]
        return getText(this._page, summaryCell)
    }

    activityByRow(row: number) : SummaryTableActivity {
        return new SummaryTableActivity(this._page, row)
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}