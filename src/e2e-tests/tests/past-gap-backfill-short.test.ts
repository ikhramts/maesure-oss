import * as moment from 'moment'
import { MaesurePage } from "e2e/model/MaesurePage";
import { createStoppedTestAccountWithPopupFrequency } from "e2e/utils/account-steps";
import { sleep } from 'e2e/model/helpers';

// In this test, we verify that for gaps longer than one TimeBlockLength
// we have a PastGapBackfiller showing up
describe("Past gap backfill - short gap", () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test('Test', async () => { 
        // This test should take < 4 min
        jest.setTimeout(4 * 60 * 1000)
        await createStoppedTestAccountWithPopupFrequency(maesurePage, "1")

        // Start the time tracker and do NOT submit the first popup.
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        const startTrackingTimeMsec = moment().startOf('minute').toDate().getTime()
        await timeTrackerWidget.clickStartTrackingTime()
        await timeTrackerWidget.waitForResponseInput()

        // Skip first three popups.
        const sleepUntil = startTrackingTimeMsec + 3*60*1000 + 3*30
        const sleepMsec = sleepUntil - (new Date()).getTime()
        await sleep(sleepMsec)

        // Submit a popup.
        await timeTrackerWidget.waitForResponseInput()
        await timeTrackerWidget.enterResponse("test1")
        await timeTrackerWidget.clickSubmitResponse()

        // A backfill popup should appear.
        // Submit it too.
        await sleep(200)
        await timeTrackerWidget.waitForResponseInput()
        await timeTrackerWidget.enterResponse("test2")
        await timeTrackerWidget.clickSubmitResponse()

        // There is a chance that we just got another "What are you doing now" popup. 
        // If so, process it.
        let gotAnotherOpenTextPopup = false
        try {
            await timeTrackerWidget.waitForResponseInput({timeout: 7000})
            gotAnotherOpenTextPopup = true
        } catch {
            // It's not there. We'll move on.
        }

        if (gotAnotherOpenTextPopup) {
            // Submit it.
            await timeTrackerWidget.enterResponse("test2")
            await timeTrackerWidget.clickSubmitResponse()
        }

        // We should be asked whether "test2" is all we were doing.
        await sleep(200)
        const yesNoPopup = timeTrackerWidget.yesNoPopup()
        const questionText = await yesNoPopup.questionText()
        expect(questionText).toMatch("test2")

        // Click yes. We should be done with the popups for now.
        await yesNoPopup.clickYesButton()
        await timeTrackerWidget.waitForInfoText()
    })

    afterEach(async () => {
        const result = (jasmine as any)['currentTest']

        if (result.failedExpectations.length) {
            await maesurePage.screenshot(result.fullName)
        }

        await maesurePage.close();
    })
})