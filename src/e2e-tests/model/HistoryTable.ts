import * as puppeteer from 'puppeteer'
import { HistoryRowViewer } from './HistoryRowViewer'
import { ElementHandle } from 'puppeteer'
import { HistoryRowEditor } from './HistoryRowEditor'

export class HistoryTable {
    constructor(page: puppeteer.Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('table.historyTable')
    }

    row(rowNum: number) : HistoryRowViewer {
        return new HistoryRowViewer(this._page, rowNum)
    }

    rowEditor(rowNum: number) : HistoryRowEditor {
        return new HistoryRowEditor(this._page, rowNum)
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}