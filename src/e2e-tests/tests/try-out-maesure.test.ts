import * as moment from 'moment'
import { MaesurePage } from "e2e/model/MaesurePage";
import { sleep } from "e2e/model/helpers";
import { clickForgetMe } from 'e2e/utils/account-steps';

describe("Try out maesure", () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test("Initial nav bar", async () => {
        const navBar = maesurePage.navBar();

        // What should and should not be in the nav bar
        await navBar.waitForNavLink('Contact')
        await navBar.waitForNavLink('Sign in')
        await navBar.waitForNavLink('Create account')
        await navBar.shouldNotHaveLink('Forget me')
        await navBar.shouldNotHaveLink('Track time')

        // Should see the big "Start tracking time" link
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        await timeTrackerWidget.waitForStartTrackingTimeLink()
    })

    test("Try out Maesure and stop", async () => {
        // This test should take < 1 min
        jest.setTimeout(60 * 1000)

        // Submit an initial response
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        await sleep(200)
        await timeTrackerWidget.clickStartTrackingTime()
        await sleep(500)
        const responseSubmitTime = moment(new Date())
        await timeTrackerWidget.clickSubmitResponse()

        // A few things should exist now.
        // Time tracker widget
        const infoTextElement = await timeTrackerWidget.waitForInfoText()
        expect(infoTextElement).toBe("The time tracker is running. It will ask what you're doing every 15 minutes.")
        
        await timeTrackerWidget.waitForStopLink()
        await timeTrackerWidget.waitForShowSettingsLink()
        
        // New NavBar links
        const navBar = maesurePage.navBar()
        await navBar.waitForNavLink('Track time')
        await navBar.waitForNavLink('Contact')
        await navBar.waitForNavLink('Forget me')
        await navBar.waitForNavLink('Create account')

        // Results section
        //  - Should be present
        const resultsSection = maesurePage.resultsSection()
        const summaryTable = resultsSection.summaryTable()
        await summaryTable.waitForPresent()

        //  - Should have proper activity recorded
        const firstActivity = summaryTable.activityByRow(1)
        const firstActivityName = await firstActivity.name()
        expect(firstActivityName).toBe("Trying out Maesure")

        //  - Should have the right headers
        const firstSummaryHeader = await summaryTable.summaryColumnHeaderText(1)
        const secondSummaryHeader = await summaryTable.summaryColumnHeaderText(2)

        const today = moment(new Date()).subtract(1, 'days')
        const dayOfWeek = today.format('ddd')
        const monthAndDate = today.format('MMM D')

        expect(firstSummaryHeader).toMatch(dayOfWeek)
        expect(firstSummaryHeader).toMatch(monthAndDate)
        expect(secondSummaryHeader).toMatch('Today')

        //  - Should have the right total times
        const yesterdayTotalTime = await summaryTable.summaryCellText(1, 1)
        const todayTotalTime = await summaryTable.summaryCellText(1, 2)

        expect(yesterdayTotalTime.trim()).toBe("0:00")
        expect(todayTotalTime.trim()).toBe("0:15")

        // Should show notification permission request
        // const notificationPermissionRequest = maesurePage.notificationPermissionRequest()
        // await notificationPermissionRequest.waitForPresent()

        // Should show an ad for a permanent account
        await resultsSection.waitForAdForPermanentAccount()

        // Look at the History section
        const historyLink = await resultsSection.linkToHistory()
        await historyLink.click()

        const historyTable = resultsSection.historyTable()
        await historyTable.waitForPresent()

        const historyRow1 = historyTable.row(1)
        await historyRow1.waitForPresent()

        const fromDate = await historyRow1.fromDate()
        const expectedFromDate = responseSubmitTime.format("YYYY-MMM-DD")
        expect(fromDate).toBe(expectedFromDate)

        const fromTime = await historyRow1.fromTime()
        const expectedFromTime = responseSubmitTime.format("H:mm")
        expect(fromTime).toBe(expectedFromTime)

        const timeBlockLength = await historyRow1.timeBlockLength()
        expect(timeBlockLength).toBe("0:15")
        
        const entryText = await historyRow1.entryText()
        expect(entryText).toBe("Trying out Maesure")

        // Forget the temporary account
        await clickForgetMe(maesurePage)
        await navBar.shouldNotHaveLink('Forget me')
        await navBar.shouldNotHaveLink('Track time')
    })

    afterEach(async () => {
        const result = (jasmine as any)['currentTest']

        if (result.failedExpectations.length) {
            await maesurePage.screenshot(result.fullName)
        }

        await maesurePage.close();
    })

})