import { MaesurePage } from 'e2e/model/MaesurePage'
import { sleep } from 'e2e/model/helpers';
import { createAccountUsingGoogle, deleteAccount, createAccountUsingEmail, logOut, emailAccountExists, logInWithEmail, deleteEmailAccountIfExists, createTempAccount } from 'e2e/utils/account-steps';
import { testPlainAccountEmail, testAccountPassword } from 'e2e/utils/test-environment';

// These tests should be executed in this specific order.
describe('Account management tests', () => {
    let maesurePage : MaesurePage

    beforeEach(async () =>{
        maesurePage = await MaesurePage.open();
    })

    test.skip("Try out Maesure and create Google account", async () => {
        await createTempAccount(maesurePage)
        await createAccountUsingGoogle(maesurePage)
        await deleteAccount(maesurePage)       
    })

    test("Try out Maesure and create email account", async () => {
        await deleteEmailAccountIfExists(maesurePage)

        // Create a temp account and enter some data.
        const firstEntry = "abcd efgh"
        await createTempAccount(maesurePage, firstEntry)

        // Upgrade to a permanent account.
        await createAccountUsingEmail(maesurePage)

        // The data entered so far should be preserved.
        const resultsSection = maesurePage.resultsSection()
        const summaryTable = resultsSection.summaryTable()
        await summaryTable.waitForPresent()

        const firstActivity = summaryTable.activityByRow(1)
        const firstActivityName = await firstActivity.name()
        expect(firstActivityName).toBe(firstEntry)

        // Clean up.
        await deleteAccount(maesurePage)       
    })

    test("Directly create an account and try out Maesure", async () => {
        jest.setTimeout(60 * 1000)

        await deleteEmailAccountIfExists(maesurePage)
        await createAccountUsingEmail(maesurePage)

        // Should be greeted with a "Start tracking time" button.
        const timeTrackerWidget = maesurePage.timeTrackerWidget()
        await sleep(200)
        await timeTrackerWidget.clickStartTrackingTime()
        await sleep(500)
        await timeTrackerWidget.enterResponse("qwert")
        await timeTrackerWidget.clickSubmitResponse()

        // Clean up
        await deleteAccount(maesurePage)       
    })

    test("Try to create an existing account", async () => {
        const accountExists = await emailAccountExists(maesurePage)

        if (!accountExists) {
            await createAccountUsingEmail(maesurePage)
            await logOut(maesurePage)
        }

        // Try to create the same account
        const navBar = maesurePage.navBar()
        const createAccountLink = await navBar.waitForNavLink('Create account')
        await createAccountLink.click()

        const createAccountForm = maesurePage.createAccountForm()
        await createAccountForm.waitForPresent()

        await createAccountForm.enterEmail(testPlainAccountEmail())
        const passwordInput = await createAccountForm.passwordInput()
        await passwordInput.click()

        // Error message should appear
        await createAccountForm.waitForEmailIsBadMessage()

        // Link to reset the password should appear. Let's click it.
        const resetPasswordLink = await createAccountForm.resetPasswordLink()
        await resetPasswordLink.click()

        // Reset password form should appear.
        // Try using it.
        const resetPasswordForm = maesurePage.resetPasswordForm()
        await resetPasswordForm.waitForPresent()

        await resetPasswordForm.enterEmail(testPlainAccountEmail())
        await resetPasswordForm.clickRequestPasswordReset()
        await resetPasswordForm.waitForResetPasswordResult()

        // Clean up
        await logInWithEmail(maesurePage)
        await deleteAccount(maesurePage)

        // TODO: check that the reset password email was sent by Auth0
    })

    test("Try to enter invalid input on Create Account form", async () => {
        // Go to Create Account page
        const navBar = maesurePage.navBar()
        const createAccountLink = await navBar.waitForNavLink('Create account')
        await createAccountLink.click()

        const createAccountForm = maesurePage.createAccountForm()
        await createAccountForm.waitForPresent()
        
        // Try entering invalid email
        await createAccountForm.enterEmail("abc")
        const passwordInput = await createAccountForm.passwordInput()
        await passwordInput.click()

        await createAccountForm.waitForEmailIsBadMessage()

        // Try entering blank email
        await createAccountForm.enterEmail("")
        await passwordInput.click()
        await sleep(200)
        await createAccountForm.waitForEmailIsBadMessage()

        // Try leaving the password blank
        await createAccountForm.enterEmail(testPlainAccountEmail())
        await passwordInput.click()
        const emailInput = await createAccountForm.emailInput()
        await emailInput.click()
        await sleep(200)
        await createAccountForm.waitForPasswordIsBadMessage()

        // Try entering a short password
        await createAccountForm.enterPassword("abc")
        await emailInput.click()
        await sleep(200)
        await createAccountForm.waitForPasswordIsBadMessage()

        // Try skipping Terms and Conditions
        await createAccountForm.enterPassword(testAccountPassword())
        await emailInput.click()
        await sleep(500)
        await createAccountForm.clickCreateAccount()
        await createAccountForm.waitForConfirmTermsAndConditionsIsBadMessage()
    })

    afterEach(async () => {
        const result = (jasmine as any)['currentTest']

        if (result.failedExpectations.length) {
            await maesurePage.screenshot(result.fullName)
        }

        await maesurePage.close();
    })
        
})