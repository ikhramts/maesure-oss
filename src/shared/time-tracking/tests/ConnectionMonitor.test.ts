import * as moment from 'moment'

import { ConnectionMonitor, FIRST_CHECK_AFTER_MSEC, CHECK_BACKOFF_RATE_INCREASE } from "../ConnectionMonitor"
import { MockApiClient } from "shared/api/MockApiClient"
import { MockTimeService } from "shared/utils/time/MockTimeService"
import { MockTimerFactory } from "shared/utils/time/MockTimerFactory"
import { ConnectionErrorType } from "shared/api/ConnectionErrorType"

let _apiClient : MockApiClient
let _timeService : MockTimeService
let _timerFactory : MockTimerFactory
let _connectionMonitor : ConnectionMonitor

const TEST_NOW = new Date(2019, 11, 3, 9, 0, 0)

beforeEach(() => {
    _apiClient = new MockApiClient()
    _timeService = new MockTimeService()
    _timeService.setNow(TEST_NOW)
    _timerFactory = new MockTimerFactory()

    _connectionMonitor = new ConnectionMonitor(_apiClient, _timeService, _timerFactory)
})

test("If ApiClient connection fails, should notify monitors with next check time", () => {
    // Set up
    let nextCheckTime : Date | null = null
    _connectionMonitor.onConnectionFailed(time => {nextCheckTime = time})

    // Act
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Assert
    const expectedTime = 
        moment(TEST_NOW).add(FIRST_CHECK_AFTER_MSEC, 'milliseconds').toDate()
    expect(nextCheckTime).toStrictEqual(expectedTime)
})

test("If ApiClient connection fails, should schedule a check", () => {
    // Act
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Assert
    let lastTimer = _timerFactory.lastTimer
    expect(lastTimer?.intervalMsec).toBe(FIRST_CHECK_AFTER_MSEC)
    expect(lastTimer?.isRunning).toBe(true)
})

test("If a check fails, should schedule a longer check", async () => {
    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Set up the check to return an error
    _apiClient.testConnection = testConnectionFails

    // Time for another connection check
    await _timerFactory.lastTimer!!.triggerElapsed()

    // Assert - another error check has started.
    let lastTimer = _timerFactory.lastTimer
    expect(lastTimer?.intervalMsec)
        .toBe(FIRST_CHECK_AFTER_MSEC * CHECK_BACKOFF_RATE_INCREASE)
    expect(lastTimer?.isRunning).toBe(true)
})

test("If starting a connection check, should notify the subscribers", async () => {
    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Set up the check to return an error
    _apiClient.testConnection = testConnectionFails
    
    let notifiedCheckStarted = false
    _connectionMonitor.onConnectionCheckStarted(() => {notifiedCheckStarted = true})

    // Time for another connection check
    await _timerFactory.lastTimer!!.triggerElapsed()

    // Assert - another error check has started.
    expect(notifiedCheckStarted).toBe(true)
})

test("If a check fails, should notify the user of a longer wait for next check", async () => {
    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)
    // Calture the next notification
    let nextCheckTime : Date | null = null
    _connectionMonitor.onConnectionFailed(time => nextCheckTime = time)

    // Set up the check to return an error
    _apiClient.testConnection = testConnectionFails

    // Time for another connection check
    await _timerFactory.lastTimer!!.triggerElapsed()

    // Assert
    const expectedTime = 
        moment(TEST_NOW)
        .add(FIRST_CHECK_AFTER_MSEC * CHECK_BACKOFF_RATE_INCREASE, 'milliseconds')
        .toDate()
    expect(nextCheckTime).toStrictEqual(expectedTime)
})

test("Should not schedule checks less often than MAX_CHECK_AFTER_MSEC", () => {
})

test("If a connection check succeeds, should not schedule another check", async () => {
    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Set up the check to return an error
    _apiClient.testConnection = testConnectionSucceeds

    // Time for another connection check
    await _timerFactory.lastTimer!!.triggerElapsed()

    // Assert - there are no more checks scheduled
    let lastTimer = _timerFactory.lastTimer
    expect(lastTimer?.isRunning).toBe(false)

})

test("If a conenction check succeeds, should emit onConnectionRestored event", async () => {
    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Set up monitoring for 'connectionSucceeds' event
    let connectionRestoredEmitted = false
    _connectionMonitor.onConnectionRestored(() => connectionRestoredEmitted = true)

    // Set up the check to return an error
    _apiClient.testConnection = testConnectionSucceeds

    // Time for another connection check
    await _timerFactory.lastTimer!!.triggerElapsed()

    // Assert
    expect(connectionRestoredEmitted).toBe(true)
})

test("If a connection check succeeds and then fails again, "
        + "should schedule a check after a short wait", async () => {
    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Then a connection check fails
    _apiClient.testConnection = testConnectionFails
    await _timerFactory.lastTimer!!.triggerElapsed()

    // Then a connection check succeeds
    _apiClient.testConnection = testConnectionSucceeds
    await _timerFactory.lastTimer!!.triggerElapsed()

    // Then trigger another failure
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Assert
    let lastTimer = _timerFactory.lastTimer
    expect(lastTimer?.intervalMsec).toBe(FIRST_CHECK_AFTER_MSEC)
    expect(lastTimer?.isRunning).toBe(true)
}) 

test("If we're waiting for a connection check and checkNow() is called, "
        + "should check the connection immediately", async () => {

    // Set up
    let mockTestConnection = jest.fn(() => Promise.resolve())
    _apiClient.testConnection = mockTestConnection

    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Act
    await _connectionMonitor.checkNow()

    // Assert
    expect(mockTestConnection.mock.calls.length).toBe(1)
})

test("If we're waiting for a connection check and checkNow() is called and it fails, "
        + "should stop the old check timer and schedule another check later", async () => {
    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Then a connection check fails
    _apiClient.testConnection = testConnectionFails
    await _connectionMonitor.checkNow()

    // Assert
    // Assert - another error check has started.
    let lastTimer = _timerFactory.lastTimer
    expect(lastTimer?.intervalMsec)
        .toBe(FIRST_CHECK_AFTER_MSEC * CHECK_BACKOFF_RATE_INCREASE)
    expect(lastTimer?.isRunning).toBe(true)
})

test("If we're waiting for a connection check and checkNow() is called and succeeds, "
        + "should not do any more connection checks", async () => {

    // The first error occurs.
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)

    // Then a connection check succeeds.
    _apiClient.testConnection = testConnectionSucceeds
    await _connectionMonitor.checkNow()

    // Assert
    expect(_timerFactory.lastTimer!!.isRunning).toBe(false)
})

test("If we're NOT waiting for a connection check and checkNow() is called, "
        + "should ignore the call", async () => {

    // Set up
    let mockTestConnection = jest.fn(() => Promise.resolve())
    _apiClient.testConnection = mockTestConnection

    // Act
    await _connectionMonitor.checkNow()

    // Assert
    expect(mockTestConnection).toBeCalledTimes(0)
})

// ================ Helpers ===================
function testConnectionFails() : Promise<void> {
    _apiClient.connectionErrorEvent.emit(ConnectionErrorType.Connection)
    throw "error"
}

function testConnectionSucceeds() : Promise<void> {
    return Promise.resolve()
}