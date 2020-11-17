import { BrowserWindow, BrowserWindowConstructorOptions, WebContents } from "electron";

export class AppWindow {
    constructor(url: string, options: BrowserWindowConstructorOptions, delayShowMsec?: number, openDevTools?: boolean) {
        this._url = url
        this._options = options
        this._openDevTools = !!openDevTools
        this._delayShowMsec = delayShowMsec
        
        this.open = this.open.bind(this)
    }
    
    open() {
        if (this._window) {
            this._window.focus()
            return
        }

        // Create the window.
        const windowOptions = {} as BrowserWindowConstructorOptions
        Object.assign(windowOptions, this._options)

        if (this._delayShowMsec) {
            windowOptions.show = false
        }

        this._window = new BrowserWindow(windowOptions);
        this._window.loadURL(this._url);
    
        // Open the DevTools.
        if (this._openDevTools) {
            this._window.webContents.openDevTools()  
        }

        if (this._delayShowMsec) {
            setTimeout(() => { this._window!!.show()}, this._delayShowMsec)
        }
    
        // Emitted when the window is closed.
        this._window.on('closed', () => {
            this._window = null;
        });
    }

    getWebContents() : WebContents | null {
        if (this._window) {
            return this._window.webContents
        } else {
            return null
        }
    }

    // ====================== Private ======================
    private _window : BrowserWindow | null = null
    private _url: string;
    private _options: BrowserWindowConstructorOptions
    private _openDevTools: boolean
    private _delayShowMsec?: number
}
