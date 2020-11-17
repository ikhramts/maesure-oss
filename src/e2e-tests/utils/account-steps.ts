import { ElementHandle } from "puppeteer";
import { fetch } from 'cross-fetch'
import { MaesurePage } from "e2e/model/MaesurePage";
import { testGoogleAccountEmail, testAccountPassword, testPlainAccountEmail, MAESURE_BASE_URL } from "./test-environment";
import { sleep } from "e2e/model/helpers";

export async function createTempAccount(maesurePage: MaesurePage, initialSubmission?: string) : Promise<void> {
    // Submit an initial response
    const timeTrackerWidget = maesurePage.timeTrackerWidget()
    await sleep(200)
    await timeTrackerWidget.clickStartTrackingTime()
    
    if (initialSubmission) {
        await timeTrackerWidget.enterResponse(initialSubmission)
    }
    
    await sleep(500)
    await timeTrackerWidget.clickSubmitResponse()

    // A few things should exist now.
    // Time tracker widget
    const infoTextElement = await timeTrackerWidget.waitForInfoText()
    expect(infoTextElement).toBe("The time tracker is running. It will ask what you're doing every 15 minutes.")
}

export async function clickForgetMe(maesurePage: MaesurePage) : Promise<void> {
    // Forget the temporary account
    const navBar = maesurePage.navBar()
    const forgetMeNavLink = await navBar.waitForNavLink("Forget me")
    await forgetMeNavLink.click()

    const modal = maesurePage.confirmModal()
    await modal.clickOk()

    // Wait to finish navigating away
    const timeTrackerWidget = maesurePage.timeTrackerWidget()
    await timeTrackerWidget.waitForStartTrackingTimeLink()
}

export async function createAccountUsingGoogle(maesurePage: MaesurePage) : Promise<void> {
    const navBar = maesurePage.navBar()
    const page = maesurePage.page()

    const createAccountNavLink = await navBar.waitForNavLink("Create account")
    await createAccountNavLink.click()

    const createAccountForm = maesurePage.createAccountForm()
    await createAccountForm.waitForPresent()
    await createAccountForm.clickContinueWithGoogle()
    await maesurePage.waitForNavigation()

    // A few things may happen.
    // If this account is not logged in to Google already, it will be asked to log in.
    // If an account is already logged in, Google will skip past this part.
    let googleEmailInput : ElementHandle<Element> | null = null

    try {
        googleEmailInput = await page.waitForSelector('input[type=email]', {timeout: 10 * 1000, visible: true})
    } catch {
        // We might not be shown this screen.
    }
    
    if (googleEmailInput) {
        // Google showed us a login form.
        await page.type('input[type=email]', testGoogleAccountEmail())
        await googleEmailInput.click()
        await page.keyboard.type(String.fromCharCode(13))

        // Wait for the password input to appear and enter the password.
        const passwordInput = await page.waitForSelector('input[type=password]', {visible: true})
        await sleep(500)
        await page.type('input[type=password]', testAccountPassword(), {delay: 150})
        await sleep(500)
        await passwordInput.click()
        await page.keyboard.type(String.fromCharCode(13))

        await maesurePage.waitForNavigation()

    } // else: we skip to the next step

    await authorizeAuth0AppIfRequested(maesurePage)

    // Done! In some cases Google will send us right to this point.
    // By the end of this function, we should be back at Maesure.
}

export async function createAccountUsingEmail(maesurePage: MaesurePage) {
    const navBar = maesurePage.navBar()

    // Navigate to Create Account page
    const createAccountNavLink = await navBar.waitForNavLink("Create account")
    await createAccountNavLink.click()

    // Enter basic info.
    const createAccountForm = maesurePage.createAccountForm()
    await createAccountForm.waitForPresent()

    await createAccountForm.enterEmail(testPlainAccountEmail())
    await createAccountForm.enterPassword(testAccountPassword())
    await createAccountForm.clickConfirmTermsAndConditions()

    // Wait to see whether the email is already in the system.
    const emailIsValidMessage = await createAccountForm.waitForEmailIsGoodMessage()

    if (!emailIsValidMessage) {
        throw `Could not use email ${testPlainAccountEmail()} to create an account.`
    }

    // Create the account
    await createAccountForm.clickCreateAccount()
    await maesurePage.waitForNavigation()
}

export async function deleteAccount(maesurePage: MaesurePage) : Promise<void> {
    // Go to the account settings page.
    const navBar = maesurePage.navBar()
    await navBar.clickAccountMenuLink()
    await navBar.clickAccountSettings()

    // Delete the account.
    const deleteAccountSection = maesurePage.accountSettingsPage().deleteAccountSection()
    await deleteAccountSection.clickDeleteAccountButton()
    await deleteAccountSection.enterConfirmDeleteText('delete')
    await deleteAccountSection.clickConfirmDeleteButton()

    // Wait for deletion to complete.
    await maesurePage.waitForNavigation()
    const timeTrackerWidget = maesurePage.timeTrackerWidget()
    await timeTrackerWidget.waitForStartTrackingTimeLink()
}

export async function logInWithEmail(maesurePage: MaesurePage) : Promise<void> {
    // Reset the page to be sure.
    await maesurePage.gotoMaesureUrl()

    // Click "Sign in"
    const navBar = maesurePage.navBar()
    const signInLink = await navBar.waitForNavLink("Sign in")
    await signInLink.click()
    await maesurePage.waitForNavigation()

    // Type in the Auth0 account details
    const page = maesurePage.page()
    const emailInput = await page.waitForSelector("#email")
    await emailInput.type(testPlainAccountEmail())

    const passwordInput = await page.waitForSelector('#password')
    await passwordInput.type(testAccountPassword())

    const signInButton = await page.waitForSelector('#btn-login')
    await signInButton.click()
    await maesurePage.waitForNavigation()

    // May have to authorize the app.
    await authorizeAuth0AppIfRequested(maesurePage)

    // We should be logged in on the main page now.
    await navBar.waitForAccountMenuLink()
}

export async function emailAccountExists(maesurePage: MaesurePage) : Promise<boolean> {
    const url = MAESURE_BASE_URL + '/api/signup/is-email-available/' + testPlainAccountEmail()
    const reply = await fetch(url, { headers: { 'Cache-Control': 'no-cache'}})
    return !reply.ok
}

export async function deleteEmailAccountIfExists(maesurePage: MaesurePage) : Promise<void> {
    // Try to log in. If the login succeeds, delete the account.
    const accountExists = await emailAccountExists(maesurePage)

    if (accountExists) {
        await logInWithEmail(maesurePage)
        await deleteAccount(maesurePage)
    }
}

export async function logOut(maesurePage: MaesurePage) : Promise<void> {
    const navBar = maesurePage.navBar()
    await navBar.clickAccountMenuLink()
    await navBar.clickLogout()
    await maesurePage.waitForNavigation()
}

export async function createStoppedTestAccountWithPopupFrequency(maesurePage: MaesurePage, minutes: string) {
    // Click the bug button to create the temp account.
    const timeTrackerWidget = maesurePage.timeTrackerWidget()
    await timeTrackerWidget.clickStartTrackingTime()
    
    // Open the settings form
    const showSettingsLink = await timeTrackerWidget.waitForShowSettingsLink()
    await showSettingsLink.click()

    // Give the server time to catch up.
    await sleep(1000)

    // Set the popup frequency and close the form.
    const settingsForm = timeTrackerWidget.settingsForm()
    await settingsForm.enterPopupFrequency(minutes)
    await settingsForm.clickSaveButton()
    await settingsForm.waitForSaveDone()

    const hideSettingsLink = await timeTrackerWidget.waitForHideSettingsLink()
    await hideSettingsLink.click()
    await settingsForm.waitForAbsent()

    // Stop the poll and wait for the "Start tracking time" banner.
    await timeTrackerWidget.clickStop()
    await timeTrackerWidget.waitForStartTrackingTimeLink()

    // Done.
}

// ================== Helpers =================================
async function authorizeAuth0AppIfRequested(maesurePage: MaesurePage) {
    // If the account is logged in, we may (or may not) be asked by Auth0 to 
    // to approve using this Maeusre instance.
    const page = maesurePage.page()
    let acceptAddAppButton : ElementHandle<Element> | null = null 

    try {
        acceptAddAppButton = await page.waitForSelector('button[value=accept]', {timeout: 10 * 1000, visible: true })
    } catch {
        // We might not be shown this screen.
    }

    if (acceptAddAppButton) {
        // Click on the "Accept" button
        await acceptAddAppButton.click()
        await maesurePage.waitForNavigation()
    }
}