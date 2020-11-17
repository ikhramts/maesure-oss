import * as puppeteer from 'puppeteer'
import { ElementHandle, WaitForSelectorOptions } from 'puppeteer'
import { TimeTrackerSettingsForm } from './TimeTrackerSettingsForm'
import { getText, sleep } from './helpers'
import { YesNoResponseForm } from './YesNoResponseForm'
import { SimpleResponseFormDropdown } from './SimpleResponseFormDropdown'

export class TimeTrackerWidget {
    static readonly WHAT_ARE_YOU_DOING_NOW = 'What were you doing right before you saw this?'
    static readonly WHAT_WERE_YOU_DOING_AT = 'What were you doing at '
    static readonly TIME_TRACKER_IS_RUNNING = "The time tracker is running."

    constructor(page: puppeteer.Page) {
        this._page = page
    }

    settingsForm() : TimeTrackerSettingsForm {
        return new TimeTrackerSettingsForm(this._page)
    }

    openTextDropdown() : SimpleResponseFormDropdown {
        return new SimpleResponseFormDropdown(this._page)
    }

    yesNoPopup() : YesNoResponseForm {
        return new YesNoResponseForm(this._page)
    }

    async waitForPresent() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget');
    }

    async waitForStartTrackingTimeLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_startTracking')
    }

    async clickStartTrackingTime()  : Promise<void>  {
        const startTrackingElt = await this.waitForStartTrackingTimeLink()
        await startTrackingElt.click()
    }

    async openTextQuestion() : Promise<string> {
        const p = await this._page.$('#timeTrackerWidget_openText_question')

        if (!p) {
            throw "Open text input is not visible"
        }

        return getText(this._page, p)
    }

    async getResponseInput() : Promise<ElementHandle<Element> | null> {
        return this._page.$('#timeTrackerWidget_openText_input')
    }

    async waitForResponseInput(options?: WaitForSelectorOptions) : Promise<ElementHandle<Element>> { 
        return this._page.waitForSelector('#timeTrackerWidget_openText_input', options)
    }

    async enterResponse(text: string) : Promise<void> {
        const input = await this.waitForResponseInput()
        await input.click({clickCount: 3})
        await input.type(text, {delay: 100})
    }

    async waitForSubmitResponseButton() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_submit')
    }

    async waitForSubmitButtonEnabled() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_submit:not([disabled])')
    } 

    async waitForSubmitButtonDisabled() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_submit[disabled]')
    } 

    async clickSubmitResponse() : Promise<void>  {
        const submitResponseButton = await this.waitForSubmitButtonEnabled()
        await submitResponseButton.click()
    }

    async waitForInfoText() : Promise<string> {
        const pElement = await this._page.waitForSelector('#timeTrackerWidget_waitingPlaceholder')
        return await this._page.evaluate(element => element.textContent, pElement)
    }

    async waitForShowSettingsLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_showSettings')
    }

    async waitForHideSettingsLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_hideSettings')
    }

    async waitForStopLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_stop')
    }

    async clickStop() : Promise<void> {
        const stopLink = await this.waitForStopLink()
        await stopLink.click()
    }

    async waitForDisableWebtrackerLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_disableWebtracker')
    }

    async waitForEnableWebtrackerLink() : Promise<ElementHandle<Element>> {
        return this._page.waitForSelector('#timeTrackerWidget_enableWebtracker')
    }

    async waitForPopup(timeoutSec : number) : Promise<void> {
        const timeoutMsec = timeoutSec * 1000

        const nowMsec = (new Date()).getTime()
        const waitUntilMsec = nowMsec + timeoutMsec

        while((new Date()).getTime() < waitUntilMsec) {
            const input = await this.getResponseInput()

            if (input) {
                return
            }

            await sleep(100)
        }

        throw `Popup did not appear after ${timeoutSec} seconds.`

    }

    // ================ Private ====================
    private _page : puppeteer.Page
}