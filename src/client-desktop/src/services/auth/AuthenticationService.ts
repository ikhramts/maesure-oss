import { ipcMain, BrowserWindow, webContents } from 'electron'
import * as request from 'request'
import * as url from 'url'
import * as keytar from 'keytar'
import * as os from 'os'
import log from 'electron-log'
import { IPC_CHANNEL_REQUEST_ACCESS_TOKEN, IPC_CHANNEL_REPLY_ACCESS_TOKEN, IPC_CHANNEL_REQUEST_LOGIN, IPC_CHANNEL_REPLY_LOGIN, IPC_CHANNEL_REQUEST_LOGOUT, IPC_CHANNEL_REPLY_LOGOUT, IPC_CHANNEL_UPDATE_LOGIN_STATE } from './Constants';
import { IpcAccessTokenReply } from './IpcAccessTokenRequest';
import { LoginState } from './LoginState';
import { IpcLoginStateUpdate } from './IpcLoginStateUpdate';

const KEYTAR_SERVICE = 'maesure-desktop'
const KEYTAR_ACCOUNT = os.userInfo().username

const AUTH0_API_IDENTIFIER = 'https://maesure.com/api/'
const AUTH0_DOMAIN = "maesure.auth0.com"
const AUTH0_CLIENT_ID = "42Zp73wOjo5QHyv6CuIUQ3ONzJzsnJVj"
const AUTH0_REDIRECT_URI = "file:///callback"

const AUTH0_AUTHENTICATION_URL = 'https://' + AUTH0_DOMAIN + '/authorize?' +
    'audience=' + AUTH0_API_IDENTIFIER + '&' +
    'scope=openid profile email offline_access&' +
    'response_type=code&' +
    'client_id=' + AUTH0_CLIENT_ID + '&' +
    'redirect_uri=' + AUTH0_REDIRECT_URI

const AUTH0_LOGOUT_URL = `https://${AUTH0_DOMAIN}/v2/logout`

const REFRESH_ACCESS_TOKEN_FREQ_MSEC = 12 * 60 * 60 * 1000

export class AuthenticationService {
    constructor() {
        this.refreshAccessToken = this.refreshAccessToken.bind(this)

        // Accept renderer process reqests for access token.
        ipcMain.on(IPC_CHANNEL_REQUEST_ACCESS_TOKEN, (event, args) => {
            const {correlationId} = args
            event.reply(IPC_CHANNEL_REPLY_ACCESS_TOKEN, {
                    correlationId: correlationId,
                    accessToken: this._accessToken
                } as IpcAccessTokenReply)
        })

        // Accept renderer request to login
        ipcMain.on(IPC_CHANNEL_REQUEST_LOGIN, (event, args) => {
            const {correlationId} = args
            
            this.login().then(() => {
                event.reply(IPC_CHANNEL_REPLY_LOGIN, {correlationId: correlationId})
            })
        })

        // Accept renderer request to logout
        ipcMain.on(IPC_CHANNEL_REQUEST_LOGOUT, (event, args) => {
            const {correlationId} = args
            
            this.logout().then(() => {
                event.reply(IPC_CHANNEL_REPLY_LOGOUT, {correlationId: correlationId})
            })
        })
    }
    
    async login() {
        // 1. Check if the refresh token is available.
        //      - if yes, refresh it
        // 2. If not, open the login window and go through the login flow.
        //      - Handle the window being closed without login => quit
        //      - Handle successful login - extract auth_code
        // 3. Exchange the auth_code for the tokens
        log.info("AuthenticationService.login(): Starting.")

        this._isLoggingIn = true
        try {
            log.info("AuthenticationService.login(): Trying to refresh access token")
            await this.refreshAccessToken()
        } catch (error) {
            try {
                log.info("AuthenticationService.login(): Could not refresh the access token. Trying to ask the user to log in")
                await this.askToLogIn()

            } finally {
                log.info("AuthenticationService.login(): Done logging in.")
                this._isLoggingIn = false
            }
        }

        this._isLoggingIn = false
        log.info("AuthenticationService.login(): Starting regular access token updates. Refresh interval: " + REFRESH_ACCESS_TOKEN_FREQ_MSEC + " msec.")
        this._refreshTokenInterval = setInterval(this.refreshAccessToken, REFRESH_ACCESS_TOKEN_FREQ_MSEC)
        log.info("AuthenticationService.login(): Done.")
    }

    async logout() : Promise<void> {
        log.info("AuthenticationService.logout(): Started")
        // Clean up the refresh token and access token.
        this._isLoggingOut = true

        log.info("AuthenticationService.logout(): Clean up local data: starting.")
        await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
        this._accessToken = null;
        log.info("AuthenticationService.logout(): Cleanup local data: done.")

        // Stop any automated login refreshes.
        log.info("AuthenticationService.logout(): stopping access token refreshes: starting.")
        if (this._refreshTokenInterval) {
            clearInterval(this._refreshTokenInterval)
            this._refreshTokenInterval = null
        }
        log.info("AuthenticationService.logout(): stopping access token refreshes: done.")

        log.info("AuthenticationService.logout(): Logging out of Auth0: starting")

        // Log out of Auth0.
        return new Promise(resolve => {
            const logoutWindow = new BrowserWindow({
                show: false,
            });

            logoutWindow.loadURL(AUTH0_LOGOUT_URL);

            logoutWindow.on('ready-to-show', async () => {
                logoutWindow.close();
                log.info("AuthenticationService.logout(): Logging out of Auth0: done")
                this.emitLoginState(LoginState.NotLoggedIn)
                this._isLoggingOut = false
                log.info("AuthenticationService.logout(): Done.")
                resolve();
            });
        })
    }

    async hasRefreshToken() : Promise<boolean> {
        const refreshToken = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
        return !!refreshToken
    }

    getAccessToken() : string | null {
        return this._accessToken
    }

    isLoggedIn() : boolean {
        return this._accessToken != null
    }

    isLoggingIn() : boolean {
        return this._isLoggingIn
    }

    isLoggingOut() : boolean {
        return this._isLoggingOut
    }

    // ================ Private ====================
    private _accessToken : string | null = null
    private _loginWindow : BrowserWindow | null = null
    private _isLoggingIn = false
    private _isLoggingOut = false
    private _refreshTokenInterval : NodeJS.Timeout | null = null

    // private keepRefreshingAccessToken() {
    //     // Every N minutes
    //     this.refreshAccessToken()
    // }

    private async refreshAccessToken() {
        log.info("AuthenticationService.refreshAccessToken(): Starting")

        return new Promise(async (resolve, reject) => {
            log.info("AuthenticationService.refreshAccessToken(): getting refreshToken")
            const refreshToken = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
        
            if (!refreshToken) {
                log.info("AuthenticationService.refreshAccessToken(): No refresh token, exiting")
                this.emitLoginState(LoginState.NotLoggedIn)
                return reject();
            }

            log.info("AuthenticationService.refreshAccessToken(): found refresh token; trying to get acces token.")
        
            const refreshOptions = {
              method: 'POST',
              url: `https://${AUTH0_DOMAIN}/oauth/token`,
              headers: {'content-type': 'application/json'},
              body: {
                grant_type: 'refresh_token',
                client_id: AUTH0_CLIENT_ID,
                refresh_token: refreshToken,
              },
              json: true,
            };
        
            request(refreshOptions, async (error, response, body) => {
                log.info("AuthenticationService.refreshAccessToken(): got token response")
                if (error || body.error) {
                    log.info("AuthenticationService.refreshAccessToken(): got error token response, will abort loading access token.")
                    await this.logout();
                    this.emitLoginState(LoginState.NotLoggedIn)
                    return reject(error || body.error);
                }
            
                log.info("AuthenticationService.refreshAccessToken(): got access token, finishing")
                this._accessToken = body.access_token;

                // We don't need to save the new version of Refresh Token
                // because it is good until explicitly revoked.
            
                this.emitLoginState(LoginState.LoggedIn)
                log.info("AuthenticationService.refreshAccessToken(): Done")
                resolve();
            });
          });
    }

    private askToLogIn() : Promise<void> {
        log.info("AuthenticationService.askToLogIn(): Starting")

        // Open a new login window.
        this.destroyLoginWindow()

        return new Promise(async (resolve, reject) => {
            log.info("AuthenticationService.askToLogIn(): opening browser window")
            this._loginWindow = new BrowserWindow({
                width: 400,
                height: 600,
                autoHideMenuBar: true,
            });

            const loginWindow = this._loginWindow

            // Naviate to Auth0 login page.
            log.info("AuthenticationService.askToLogIn(): loading Auth0 login page")
            loginWindow.loadURL(AUTH0_AUTHENTICATION_URL)

            // After a successful login the user will be sent to
            // page file:///callback?<query_params>, where the query_params
            // will contain the authorization code. We'll need to capture
            // this authorization code.
            const { session: {webRequest}} = loginWindow.webContents

            const filter = {
                urls: [AUTH0_REDIRECT_URI + '*']
            }

            webRequest.onBeforeRequest(filter, async ({url}) => {
                log.info("AuthenticationService.askToLogIn(): intercepted file:///callback")
                await this.loadTokensFromCallbackUrl(url);

                log.info("AuthenticationService.askToLogIn(): loaded token from callback URL")
                this.destroyLoginWindow()
                log.info("AuthenticationService.askToLogIn(): destroyed login window")
                log.info("AuthenticationService.askToLogIn(): Done")
                resolve()
            });

            this._loginWindow.on('closed', () => {
                this._loginWindow = null
                log.info("AuthenticationService.askToLogIn(): login window is closed")
            })
        })
    }

    private destroyLoginWindow() {
        if (!this._loginWindow) {
            return
        }

        this._loginWindow.close()
        this._loginWindow = null
    }

    private loadTokensFromCallbackUrl(callbackUrl : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            log.info("AuthenticationService.loadTokensFromCallbackUrl(): setting up token request")
            const urlParts = url.parse(callbackUrl, true);
            const query = urlParts.query;
        
            const exchangeOptions = {
                'grant_type': 'authorization_code',
                'client_id': AUTH0_CLIENT_ID,
                'code': query.code,
                'redirect_uri': AUTH0_REDIRECT_URI,
            };
        
            const options = {
                method: 'POST',
                url: `https://${AUTH0_DOMAIN}/oauth/token`,
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(exchangeOptions),
            };
        
            log.info("AuthenticationService.loadTokensFromCallbackUrl(): sending token request")
            request(options, async (error, resp, body) => {
                log.info("AuthenticationService.loadTokensFromCallbackUrl(): received token response")

                if (error || body.error) {
                    log.error("AuthenticationService.loadTokensFromCallbackUrl(): could not load the tokens")
                    
                    if(error) {
                        log.error(error)
                    }

                    if (body.error) {
                        log.error(body.error)
                    }

                    await this.logout();
                    this.emitLoginState(LoginState.NotLoggedIn)
                    return reject(error || body.error);
                }
            
                const responseBody = JSON.parse(body);
                this._accessToken = responseBody.access_token;
                const refreshToken = responseBody.refresh_token;
                keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, refreshToken!);

                log.info("AuthenticationService.loadTokensFromCallbackUrl(): done logging in")

                // Notify the Renderer process
                this.emitLoginState(LoginState.LoggedIn)
                resolve();
            });
        });
    }

    private emitLoginState(loginState: LoginState) {
        const renderers = webContents.getAllWebContents()
        const msg = {loginState: loginState} as IpcLoginStateUpdate

        for (let renderer of renderers) {
            renderer.send(IPC_CHANNEL_UPDATE_LOGIN_STATE, msg)
        }
    }

}