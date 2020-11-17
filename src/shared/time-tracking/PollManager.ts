import { Poll } from "shared/model/Poll";
import { ITimeService } from "shared/utils/time/ITimeService";
import * as moment from 'moment'
import { ApiClient } from "shared/api/ApiClient";

export class PollManager {

    constructor(timeService: ITimeService, apiClient: ApiClient) {
        this._timeService = timeService
        this._apiClient = apiClient
    }

    startPoll(poll: Poll) : Promise<Poll> {
        if (poll.wasStarted) {
            throw "This poll was already started"
        }
        
        const pollUpdateRequest = {
            wasStarted: true,

            // Round to the start of minute to avoind any issues with calculations
            // based on this value.
            startedAt: moment(this._timeService.now()).startOf('minute').toDate()
        }

        return this._apiClient.updateDefaultPoll(pollUpdateRequest)
            .then(() => this._apiClient.fetchDefaultPoll())
    }

    stopPoll(poll: Poll) : Promise<Poll> {
        if (!poll.wasStarted) {
            throw "This poll is already stopped"
        }
        
        const pollUpdateRequest = {
            wasStarted: false
        }

        return this._apiClient.updateDefaultPoll(pollUpdateRequest)
            .then(() => this._apiClient.fetchDefaultPoll())
    }


    // ============= Private ===============
    private _timeService : ITimeService
    private _apiClient: ApiClient

}