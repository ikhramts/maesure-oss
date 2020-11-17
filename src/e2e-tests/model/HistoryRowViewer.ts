import * as puppeteer from 'puppeteer'
import { ElementHandle } from 'puppeteer'
import { waitFor, getText } from './helpers'

export class HistoryRowViewer {
    constructor(page: puppeteer.Page, rowNum: number) {
        this._page = page
        this._rowNum = rowNum
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return waitFor(async () => {
            const tbody = await this._page.$('table.historyTable tbody')
            
            if (!tbody) return null

            const rows = await tbody.$$('tr.historyRowViewer')

            if (rows.length < this._rowNum) return null
            return rows[this._rowNum - 1]
        })
    }

    async fromDate() : Promise<string> {
        return this.getCellTextByClass('fromDate')
    }

    async fromTime() : Promise<string> {
        return this.getCellTextByClass('fromTime')
    }

    async toTime() : Promise<string> {
        return this.getCellTextByClass('toTime')
    }

    async timeBlockLength() : Promise<string> {
        return this.getCellTextByClass('timeBlockLength')
    }

    async entryText() : Promise<string> {
        return this.getCellTextByClass('entryText')
    }

    async editIcon() : Promise<ElementHandle<Element>> {
        const row = await this.waitForPresent()
        const icon = await row.$('a.testhandle-icon-edit')
        
        if (!icon) {
            throw `Could not find the 'edit' icon on history table row ${this._rowNum}.`
        }
        
        return icon
    }

    async clickEditIcon() : Promise<void> {
        const icon = await this.editIcon()
        await icon.click()
    }

    // ================ Private ====================
    private _page : puppeteer.Page
    private _rowNum : number

    private async getCellTextByClass(className: string) : Promise<string> {
        const row = await this.waitForPresent()
        const cell = await row.$('td.' + className)

        if (!cell) {
            throw `Could not find column with class '${className}'`
        }

        return getText(this._page, cell)
    }
}