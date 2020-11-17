import * as url from 'url'
import * as path from 'path'
import { BrowserWindowConstructorOptions } from 'electron'
import { AppWindow } from './AppWindow'
import { SIMPLE_POPUP_WIDTH, SIMPLE_POPUP_HEIGHT } from 'client/Constants'

// Getting Started window
const gettingStartedUrl = url.format({
    pathname: path.join(__dirname, './index.html'),
    protocol: 'file:',
    slashes: true,
    hash: '/getting-started'
})

const gettingStartedWindowOptions = {
    height: 660,
    width: 800,
    autoHideMenuBar: true,
    title: "Maesure",
    frame: true,
    show: true,
    webPreferences: {
        nodeIntegration: true
    }
} as BrowserWindowConstructorOptions

export const gettingStartedWindow = new AppWindow(gettingStartedUrl, gettingStartedWindowOptions, 4000 /* delayShowMsec */)

// Time Tracker Popup window
const timeTrackerPopupUrl = url.format({
    pathname: path.join(__dirname, './index.html'),
    protocol: 'file:',
    slashes: true,
    hash: '/time-tracker-popup'
})

const timeTrackerPopupOptions = {
    height: SIMPLE_POPUP_HEIGHT,
    width: SIMPLE_POPUP_WIDTH,
    autoHideMenuBar: true,
    title: "Maesure",
    frame: false,
    show: false,
    webPreferences: {
        nodeIntegration: true
    }
} as BrowserWindowConstructorOptions

export const timeTrackerPopupWindow = new AppWindow(timeTrackerPopupUrl, timeTrackerPopupOptions, 0)

