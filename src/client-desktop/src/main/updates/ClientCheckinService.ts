import log from 'electron-log'
import { app } from 'electron';

import { ApiClient } from 'shared/api/ApiClient';
import { TimeTrackerEnvironment } from 'shared/time-tracking/TimeTrackerEnvironment';

const VERSION = app.getVersion()

/**
 * Checks in with the server periodically reporting its version.
 * This helps us collect data on who is using what kind of client and 
 * who is behind on upgrades.
 */
export class ClientCheckinService {
    constructor(apiClient: ApiClient, env: TimeTrackerEnvironment) {
        this._apiClient = apiClient
        this._env = env
    }

    start() {
        setInterval(async () => {
            try {
                log.info("Checking in with the server.")
                await this._apiClient.sendClientCheckin(this._env, VERSION)
            } catch (err) {
                log.error("Encountered an error checking in")
                log.error(err)
            }
            
        }, 6 * 60 * 60 * 1000)
        // ^--- Will check in ~4 times per day
    }

    // ==================== Private ====================
    private _apiClient : ApiClient
    private _env: TimeTrackerEnvironment
}