import * as moment from 'moment'
import { MaesurePage } from "e2e/model/MaesurePage";
import { createStoppedTestAccountWithPopupFrequency } from "e2e/utils/account-steps";
import { sleep } from 'e2e/model/helpers';
import { TimeTrackerWidget } from 'e2e/model/TimeTrackerWidget';

// In this test, we verify that regular popups take precedence over 
// backfill popups for the last missed popup.
describe("Popup behavior - popup precedence", () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test('Test', async () => { 
        // This test should take < 3 min
        jest.setTimeout(3 * 60 * 1000)
        await createStoppedTestAccountWithPopupFrequency(maesurePage, "2")

        // Start the time tracker and do NOT submit the first popup.
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        const startTime = moment().startOf('minute')
        const startTrackingTimeMsec = moment().startOf('minute').toDate().getTime()
        await timeTrackerWidget.clickStartTrackingTime()
        await timeTrackerWidget.waitForResponseInput()

        console.log(`startTime: ${startTime.format('HH:mm:ss')}`)
        console.log(`start waiting: ${moment().format('HH:mm:ss')}`)

        // Skip ahead until it's time for the second popup.
        // We'll try to click on the page periodically to make
        // sure that Chrome/Chromium doesn't start treating it as 
        // a background page.
        const waitUntilMsec = startTrackingTimeMsec + 2*60*1000 

        while ((new Date()).getTime() < waitUntilMsec) {
            const timeTrackerWidgetElt = await timeTrackerWidget.waitForPresent()
            await timeTrackerWidgetElt.click()
            await sleep(10 * 1000)
        }

        //const sleepMsec = waitUntilMsec - (new Date()).getTime()
        //await sleep(sleepMsec)
        console.log(`sleep end: ${moment().format('HH:mm:ss')}`)

        // Wait until the second popup appears and the backfill disappears
        const shouldAppearBeforeMsec = startTrackingTimeMsec + 2*60*1000 + 55*1000
        console.log(`waiting until: ${moment(shouldAppearBeforeMsec).format('HH:mm:ss')}`)
        let newPopupAppeared = false

        while ((new Date).getTime() < shouldAppearBeforeMsec) {
            // The below line is to make sure that we handle the moment
            // when one popup changes to another, when the popup us momentarily absent.
            await timeTrackerWidget.waitForResponseInput()

            // Check if the "What were you doing at..." question appeared yet.
            const questionText = await timeTrackerWidget.openTextQuestion()
            if (questionText.startsWith(TimeTrackerWidget.WHAT_ARE_YOU_DOING_NOW)) {
                console.log(`found popup at: ${moment().format('HH:mm:ss')}`)
                newPopupAppeared = true
                break
            }

            await sleep(100)
        }

        if (!newPopupAppeared) {
            console.log(`gave up at: ${moment().format('HH:mm:ss')}`)
            throw "A new popup did not appear in time."
        }
    })

    afterEach(async () => {
        const result = (jasmine as any)['currentTest']

        if (result.failedExpectations.length) {
            await maesurePage.screenshot(result.fullName)
        }

        await maesurePage.close();
    })
})