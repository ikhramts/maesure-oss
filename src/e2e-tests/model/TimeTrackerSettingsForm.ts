import * as puppeteer from 'puppeteer'
import { ElementHandle, Page } from 'puppeteer'
import { sleep } from './helpers'

export class TimeTrackerSettingsForm {
    constructor(page: Page) {
        this._page = page
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_settingsForm')
    }

    async waitForAbsent() : Promise<void> {
        await this._page.waitFor(() => !document.querySelector('#timeTrackerWidget_settingsForm'))
    }

    async waitForPopupFrequencyInput() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_settingsForm_desiredFrequency')
    }

    async enterPopupFrequency(minutes: string) : Promise<void> {
        const input = await this.waitForPopupFrequencyInput()
        await input.click({clickCount: 3})
        await input.type(minutes)
    }

    async waitForSaveButtonEnabled() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_settingsForm_save:not([disabled])')
    }

    async waitForSaveButtonDisabled() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_settingsForm_save[disabled]')
    }

    async clickSaveButton() : Promise<void> {
        const button = await this.waitForSaveButtonEnabled()
        await button.click()
    }

    async waitForSaveDone() : Promise<void> {
        // Save is done when the "Save" button has "Save" text again.
        await sleep(200)
        await this._page.waitForXPath("//*[@id='timeTrackerWidget_settingsForm']//button[@id='timeTrackerWidget_settingsForm_save']//*[contains(text(), 'Save')]")
    }

    // ================ Private ====================
    private _page : puppeteer.Page
}