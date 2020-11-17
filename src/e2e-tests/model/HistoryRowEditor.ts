import * as puppeteer from 'puppeteer'
import { ElementHandle } from 'puppeteer'
import { waitFor, getText } from './helpers'

export class HistoryRowEditor {
    constructor(page: puppeteer.Page, rowNum: number) {
        this._page = page
        this._rowNum = rowNum
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return waitFor(async () => {
            const tbody = await this._page.$('table.historyTable tbody')
            
            if (!tbody) return null

            const rows = await tbody.$$('tr.historyRowEditor')

            if (rows.length < this._rowNum) { 
                return null 
            }
            
            return rows[this._rowNum - 1]
        }, `Could not find HistoryRowEditor row ${this._rowNum}`)
    }

    async fromDateInput() : Promise<ElementHandle<Element>> {
        return this.getElementBySelector('.ant-calendar-picker-input')
    }

    async fromTimeInput() : Promise<ElementHandle<Element>> {
        return this.getElementBySelector('.fromTime .timeInput')
    }

    async enterFromTime(text: string) : Promise<void> {
        const input = await this.fromTimeInput()
        await input.click({clickCount: 3})
        await input.type(text, {delay: 100})
    }

    async toTimeInput() : Promise<ElementHandle<Element>> {
        return this.getElementBySelector('.toTime .timeInput')
    }

    async enterToTime(text: string) : Promise<void> {
        const input = await this.toTimeInput()
        await input.click({clickCount: 3})
        await input.type(text, {delay: 100})
    }

    async timeBlockLength() : Promise<string> {
        const elt = await this.getElementBySelector('.timeBlockLength')
        return getText(this._page, elt)
    }

    async entryTextInput() : Promise<ElementHandle<Element>> {
        return this.getElementBySelector('.entryTextAutocompleteInput')
    }

    async enterEntryText(text: string) : Promise<void> {
        const input = await this.entryTextInput()
        await input.click({clickCount: 3})
        await input.type(text, {delay: 100})
    }

    async waitForSaveButtonEnabled() : Promise<ElementHandle<Element>> {
        return waitFor(async () => {
            const row = await this.waitForPresent()
            return row.$('.saveButton:not([disabled])')
        })
    }

    async waitForSaveButtonDisabled() : Promise<ElementHandle<Element>> {
        return waitFor(async () => {
            const row = await this.waitForPresent()
            return row.$('.saveButton[disabled]')
        })
    }

    async clickSave() : Promise<void> {
        const button = await this.waitForSaveButtonEnabled()
        await button.click()
    }

    async cancelButton() : Promise<ElementHandle<Element>> {
        return this.getElementBySelector('.ant-btn-default')
    }

    async clickCancel() : Promise<void> {
        const button = await this.cancelButton()
        await button.click()
    }

    async notices() : Promise<string[]> {
        const noticeElts = await this._page.$$('table.historyTable tbody .notices .error')
        const notices = []

        for (const noticeElt of noticeElts) {
            const notice = await getText(this._page, noticeElt)
            notices.push(notice)
        }

        return notices
    }

    async waitForErrorNotice(text: string) : Promise<void> {
        await waitFor(async () => {
            const noticeElts = await this._page.$$('table.historyTable tbody .notices .error')

            for (const noticeElt of noticeElts) {
                const notice = await getText(this._page, noticeElt)
                if (notice == text) {
                    return true
                }
            }

            return null    
        })
    }

    // ================ Private ====================
    private _page : puppeteer.Page
    private _rowNum : number

    private async getElementBySelector(selector: string) : Promise<ElementHandle<Element>> {
        const row = await this.waitForPresent()

        return waitFor(async () => {
            return row.$(selector)
        }, `Timed out waiting for HistoryRowEditor element '${selector}'`)
    }
}