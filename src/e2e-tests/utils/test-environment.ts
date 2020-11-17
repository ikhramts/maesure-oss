import * as fs from 'fs'

// =========================================================
// Get the environment name and set up the appropriate config
const buffer = fs.readFileSync("./target-env.txt")
export const TARGET_ENV = buffer.toString().trim()

let maesureBaseUrl : string | null = null
let headless = true

if (TARGET_ENV == 'local') {
    maesureBaseUrl = 'http://localhost:5000'
    headless = false

} else if (TARGET_ENV == 'staging') {
    maesureBaseUrl = 'https://staging.maesure.com'

} else if (TARGET_ENV == 'prod') {
    maesureBaseUrl = 'https://maesure.com'

} else {
    throw `Unknown target test environment in target-env.txt: '${TARGET_ENV}'`
}

export const MAESURE_BASE_URL = maesureBaseUrl
export const RUN_BROWSER_HEADLESS = headless

// ========================================================
// Load the test account details
const accountBuffer = fs.readFileSync("./.testaccount.txt")
const accountDetails = accountBuffer.toString().trim()

const accountParts = accountDetails.split(":")
const email = accountParts[0]
const password = accountParts[1]

export function testGoogleAccountEmail(suffix?: string) : string {
    return email
}

export function testPlainAccountEmail(suffix?: string) : string {
    if (!suffix || suffix.trim() == "") {
        suffix = "x"
    }

    const emailParts = email.split("@")
    const fullEmail = emailParts[0] + "+" + suffix + '@' + emailParts[1]
    return fullEmail
}

export function testAccountPassword() : string {
    return password
}
