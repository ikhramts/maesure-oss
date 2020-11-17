import * as moment from 'moment'
import { MaesurePage } from "e2e/model/MaesurePage";
import { createStoppedTestAccountWithPopupFrequency } from "e2e/utils/account-steps";
import { sleep } from 'e2e/model/helpers';

// In this test, we're checking for a behavior observed (and fixed)
// in late November 2019 when a tiny invalid gap between entries caused
// unexpected popups to appear.
describe("Popup behavior - no unexpected popups", () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test('Test', async () => { 
        // This test should take < 3 min
        jest.setTimeout(3 * 60 * 1000)
        await createStoppedTestAccountWithPopupFrequency(maesurePage, "1")

        // Start the time tracker and submit the first popup.
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        const startTrackingTimeMsec = moment().startOf('minute').toDate().getTime()
        await timeTrackerWidget.clickStartTrackingTime()
        await timeTrackerWidget.waitForResponseInput()

        await timeTrackerWidget.enterResponse("test")
        await timeTrackerWidget.clickSubmitResponse()
        await timeTrackerWidget.waitForInfoText()

        // Wait for the next popup and submit it.
        await timeTrackerWidget.waitForPopup(60 + 16) // A bit over a minute
        await timeTrackerWidget.enterResponse("test2")
        await timeTrackerWidget.clickSubmitResponse()
        await timeTrackerWidget.waitForInfoText()

        // A popup should not appear until at least 2-minute mark.
        const endWaitTime = startTrackingTimeMsec + 115 * 1000

        while ((new Date()).getTime() < endWaitTime) {
            // A popup should not be present.
            const responseInput = await timeTrackerWidget.getResponseInput()
            expect(responseInput).toBeNull()

            await timeTrackerWidget.waitForInfoText()
            await sleep(100)
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