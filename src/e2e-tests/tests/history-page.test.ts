import { MaesurePage } from "e2e/model/MaesurePage";
import { createStoppedTestAccountWithPopupFrequency } from "e2e/utils/account-steps";
import { sleep, waitFor } from 'e2e/model/helpers';

// In this test, we verify that for gaps longer than one TimeBlockLength
// we have a PastGapBackfiller showing up
describe("History page", () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test('Edit a past entry on the same date', async () => { 
        // This test should take < 2 min
        jest.setTimeout(2 * 60 * 1000)
        await createStoppedTestAccountWithPopupFrequency(maesurePage, "1")

        // Submit a response.
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        await timeTrackerWidget.clickStartTrackingTime()
        await timeTrackerWidget.waitForResponseInput()
        await sleep(200)
        await timeTrackerWidget.enterResponse("test1")
        await sleep(200)
        await timeTrackerWidget.clickSubmitResponse()

        // Go to the history page and try to edit it.
        const resultsSection = maesurePage.resultsSection()
        await resultsSection.clickLinkToHistory()
        const historyTable = maesurePage.resultsSection().historyTable()
        await historyTable.waitForPresent()
        const row1 = historyTable.row(1)
        await row1.clickEditIcon()

        // Wait for the row editor to show up.
        const rowEditor = historyTable.rowEditor(1)
        await rowEditor.waitForPresent()

        // Enter some values.
        // We want to also make sure that the more advanced time parsing
        // is hooked up correctly (e.g. '2p' => '14:00')
        // We can't test setting the date without creating an account.
        await rowEditor.enterFromTime("2p")
        await rowEditor.enterToTime("14:15")
        await rowEditor.enterEntryText("test2")

        // TimeBlockLength should have updated by now.
        const timeBlockLength = await rowEditor.timeBlockLength()
        expect(timeBlockLength).toBe("0:15")

        // Submit and wait for the saved row to appear.
        // Specifically, wait for the row with the new
        // entry text to appear.
        await rowEditor.clickSave()
        await waitFor(async () => {
            await row1.waitForPresent()
            const newEntryText = await row1.entryText()
            if (newEntryText != "test2") {
                return null
            }

            return true
        })

        // Validate that the new times are correct.
        const newFromTime = await row1.fromTime()
        expect(newFromTime).toBe("14:00")

        const newToTime = await row1.toTime()
        expect(newToTime).toBe("14:15")

        const newTimeBlockLength = await row1.timeBlockLength()
        expect(newTimeBlockLength).toBe("0:15")
    })

    // test("Edit a past entry date", async () => {
    //     // TODO: implement
    // })

    // test("Past entry validation", async () => {
    //     // TODO: implement
    // })

    // test("Entry text editor should show the dropdown", async () => {
    //     // TODO: implement
    // })

    // test("After starting to edit should focus on the entry text editor", async () => {
    //     // TODO: implement
    // })

    // test("Pressing cancel button should cancel the editing", async () => {
    //     // TODO: implement
    // })

    afterEach(async () => {
        const result = (jasmine as any)['currentTest']

        if (result.failedExpectations.length) {
            await maesurePage.screenshot(result.fullName)
        }

        await maesurePage.close();
    })
})