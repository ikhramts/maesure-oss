import { MaesurePage } from "e2e/model/MaesurePage";
import { createStoppedTestAccountWithPopupFrequency } from "e2e/utils/account-steps";
import { sleep } from 'e2e/model/helpers';

// In this test, we verify that regular popups take precedence over 
// backfill popups for the last missed popup.
describe("Popup dropdown behavior", () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test('Test', async () => { 
        // This test should take < 5 min
        jest.setTimeout(5 * 60 * 1000)
        await createStoppedTestAccountWithPopupFrequency(maesurePage, "1")

        // Start the time tracker and do NOT submit the first popup.
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        await timeTrackerWidget.clickStartTrackingTime()

        // The first popup should not have a dropdown because
        // there is no data yet.
        const responseInput1 = await timeTrackerWidget.waitForResponseInput()
        await responseInput1.click()
        await sleep(300)

        const dropdown = timeTrackerWidget.openTextDropdown()
        const dropdownPresent1 = await dropdown.isPresent()
        expect(dropdownPresent1).toBeFalsy()
    
        // Provide a response and wait for the second popup.
        await timeTrackerWidget.enterResponse("a")
        await timeTrackerWidget.clickSubmitResponse()
        await timeTrackerWidget.waitForInfoText()
        await timeTrackerWidget.waitForPopup(90)

        // The second popup should have a dropdown with one entry.
        const responseInput2 = await timeTrackerWidget.waitForResponseInput()
        await responseInput2.click()
        await dropdown.waitForPresent()

        const numEntries2 = await dropdown.numEntries()
        expect(numEntries2).toBe(1)

        const entryText2_1 = await dropdown.entryText(1)
        expect(entryText2_1).toBe("a")

        // Click on this entry and wait for the next popup.
        const entry2_1 = await dropdown.entry(1)
        await entry2_1.click()
        await timeTrackerWidget.waitForInfoText()
        await timeTrackerWidget.waitForPopup(90)

        // Now there should still be one entry.
        const responseInput3 = await timeTrackerWidget.waitForResponseInput()
        await responseInput3.click()
        await dropdown.waitForPresent()

        const numEntries3 = await dropdown.numEntries()
        expect(numEntries3).toBe(1)

        const entryText3_1 = await dropdown.entryText(1)
        expect(entryText3_1).toBe("a")

        // Submit a new entry and wait for another popup.
        await timeTrackerWidget.enterResponse("b")
        await timeTrackerWidget.clickSubmitResponse()
        await timeTrackerWidget.waitForInfoText()
        await timeTrackerWidget.waitForPopup(90)

        // Now there should be two entries.
        const responseInput4 = await timeTrackerWidget.waitForResponseInput()
        await responseInput4.click()
        await dropdown.waitForPresent()

        const numEntries4 = await dropdown.numEntries()
        expect(numEntries4).toBe(2)

        const entryText4_1 = await dropdown.entryText(1)
        expect(entryText4_1).toBe("b")
        const entryText4_2 = await dropdown.entryText(2)
        expect(entryText4_2).toBe("a")

        // Use arrow keys to select "a".
        const page = maesurePage.page()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
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