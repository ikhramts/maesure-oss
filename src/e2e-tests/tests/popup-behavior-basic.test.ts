import * as moment from 'moment'
import { MaesurePage } from "e2e/model/MaesurePage";
import { createStoppedTestAccountWithPopupFrequency } from "e2e/utils/account-steps";
import { sleep } from 'e2e/model/helpers';
import { TimeTrackerWidget } from 'e2e/model/TimeTrackerWidget';

describe("Popup behavior - basic tests", () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test('Basic popup behavior', async () => {
        // This test should take < 5 min
        jest.setTimeout(5 * 60 * 1000)

        // Initialize the test: have a temp account in a stopped state, with questions set to every 2 min.
        await createStoppedTestAccountWithPopupFrequency(maesurePage, "2")

        // Starting the time tracker should show a popup immediately.
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        const startTrackingTimeMsec = moment().startOf('minute').toDate().getTime()
        await timeTrackerWidget.clickStartTrackingTime()
        await timeTrackerWidget.waitForResponseInput()
        
        // If I submit a response, the popup should disappear.
        await timeTrackerWidget.enterResponse("test")
        await timeTrackerWidget.clickSubmitResponse()
        const infoText = await timeTrackerWidget.waitForInfoText()
        const expectedWaitingText = "The time tracker is running. It will ask what you're doing every 2 minutes."
        expect(infoText).toBe(expectedWaitingText)

        // For the next two minutes, popup should not appear.
        const endNoPopupTimeMsec = startTrackingTimeMsec + 115 * 1000 // Almost 2 minutes

        while ((new Date()).getTime() < endNoPopupTimeMsec) {
            // A popup should not be present.
            const responseInput = await timeTrackerWidget.getResponseInput()
            expect(responseInput).toBeNull()

            const currentInfoText = await timeTrackerWidget.waitForInfoText()
            expect(currentInfoText).toBe(expectedWaitingText)

            await sleep(100)
        }

        // Within 30 seconds, a popup should appear.
        await sleep(5 * 1000)
        await timeTrackerWidget.waitForResponseInput({timeout: 30 * 1000})

        // For the next minute, the popup should stay open.
        // Subtract a fudge factor to account for possible misalignment with the minute borders.
        const endPopupOpenTime = startTrackingTimeMsec + 3 * 60 * 1000 - 16 * 1000

        while ((new Date()).getTime() < endPopupOpenTime) {
            // A popup should not be present.
            const questionText = await timeTrackerWidget.openTextQuestion()
            expect(questionText).toBe(TimeTrackerWidget.WHAT_ARE_YOU_DOING_NOW)

            await sleep(100)
        }

        // Within a bit over 30 seconds (when whe cross the next minute boundary)
        // the question should change to "What were you doing at..."
        const backfillShouldShowBy = startTrackingTimeMsec + 3 * 60 * 1000 + 26 * 1000
        let questionChanged = false

        while ((new Date()).getTime() < backfillShouldShowBy) {
            // The below line is to make sure that we handle the moment
            // when one popup changes to another, when the popup us momentarily absent.
            await timeTrackerWidget.waitForResponseInput()

            // Check if the "What were you doing at..." question appeared yet.
            const questionText = await timeTrackerWidget.openTextQuestion()
            if (questionText.startsWith(TimeTrackerWidget.WHAT_WERE_YOU_DOING_AT)) {
                questionChanged = true
                break
            }

            await sleep(100)
        }

        if (!questionChanged) {
            throw "Latest backfill popup did not show up."
        }

        // Submit a response. No popup should show up until at least the 4-minute mark.
        await timeTrackerWidget.enterResponse("test2")
        await timeTrackerWidget.clickSubmitResponse()
        await timeTrackerWidget.waitForInfoText()

        const noNewPopupShouldShowUpBefore = startTrackingTimeMsec + 3*60*1000 + 55*1000

        while ((new Date()).getTime() < noNewPopupShouldShowUpBefore) {
            // A popup should not be present.
            const responseInput = await timeTrackerWidget.getResponseInput()
            expect(responseInput).toBeNull()

            const currentInfoText = await timeTrackerWidget.waitForInfoText()
            expect(currentInfoText).toBe(expectedWaitingText)

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