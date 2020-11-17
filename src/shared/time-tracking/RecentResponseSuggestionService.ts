import { IResponseSuggestionService } from "./IResponseSuggestionService";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import * as moment from 'moment'
import { PollResponse } from "shared/model/PollResponse";

const MAX_SUGGESTIONS = 6

export class RecentResponseSuggestionService implements IResponseSuggestionService {
    updateTimeLogEntries(logEntries: TimeLogEntry[]) {
        const distinct = (value: string, index: number, self: string[]) => {
            return self.indexOf(value) === index
        }
        
        // Select a fixed number of most recent distinct responses.
        // We will show these to the users by default.
        const getTime = (logEntry : TimeLogEntry) => {
            return moment(logEntry.fromTime).toDate().getTime()
        }

        let recentEntries = logEntries.map(e => e)
        recentEntries.sort((first, second) =>  getTime(second) - getTime(first))

        let recentResponses = recentEntries.map(e => e.entryText).filter(distinct)
        if (recentResponses.length > MAX_SUGGESTIONS) {
            recentResponses = recentResponses.slice(0, MAX_SUGGESTIONS)
        }

        this._mostRecentResponses = recentResponses
        
        // List of all distinct responses.
        this._allResponses = logEntries.map(e => e.entryText).filter(distinct)
        this._allResponses.sort()
    }

    addNewResponses(responses: PollResponse[]) {
        for (const response of responses) {
            this.addNewResponse(response.responseText)
        }
    }

    suggestResponses(partialResponse: string): Promise<string[]> {
        if (!partialResponse || partialResponse == "") {
            return Promise.resolve(this._mostRecentResponses)
        }

        const suggestions = this.findSuggestions(partialResponse)
        return Promise.resolve(suggestions)
    }
    
    // ====================== Private ====================
    private _mostRecentResponses : string[] = []
    private _allResponses : string[] = []

    private findSuggestions(partialResponse: string) : string[] {
        const startingSuggestions = this.findStartingSuggestions(partialResponse)

        if (startingSuggestions.length >= MAX_SUGGESTIONS) {
            return startingSuggestions
        }

        const remainingSpots = MAX_SUGGESTIONS - startingSuggestions.length
        const substringSuggestions = this.findSubstringSuggestions(partialResponse, remainingSpots)
        const allSuggestions = startingSuggestions.concat(substringSuggestions)
        return allSuggestions
    }

    private findStartingSuggestions(partialResponse : string) : string[] {
        // Up to MAX_RESPONSE
        const partialResponseLower = partialResponse.toLowerCase()
        let startingSuggestions = this._allResponses.filter(r => r.toLowerCase().startsWith(partialResponseLower))

        if (startingSuggestions.length > MAX_SUGGESTIONS) {
            startingSuggestions = startingSuggestions.slice(0, MAX_SUGGESTIONS)
        }

        return startingSuggestions
    }

    private findSubstringSuggestions(partialResponse: string, remainingSpots: number) : string[] {
        const partialResponseLower = partialResponse.toLowerCase()
        
        // Find all strings that have partialResponse as subtstring that does not begin at the first
        // character.
        const filterSubstrings = (responseText: string) => {
            const responseTextLower = responseText.toLowerCase()
            const index = responseTextLower.indexOf(partialResponseLower)
            return index > 0
        }

        let suggestions = this._allResponses.filter(filterSubstrings)

        if (suggestions.length > remainingSpots) {
            suggestions = suggestions.slice(0, remainingSpots)
        }

        return suggestions
    }

    private addNewResponse(responseText: string) {
        // Update the most recent responses.
        // If the value already exists, move it to the top. Otherwise, add it.
        this._mostRecentResponses.unshift(responseText)

        const mostRecentResponsesLength = this._mostRecentResponses.length

        for (let i = 1; i < mostRecentResponsesLength; i++) {
            if (this._mostRecentResponses[i] == responseText) {
                this._mostRecentResponses.splice(i, 1)
            }
        }

        if (this._mostRecentResponses.length > MAX_SUGGESTIONS) {
            this._mostRecentResponses = this._mostRecentResponses.slice(0, MAX_SUGGESTIONS)
        }

        // Update all responses.
        if (!this._allResponses.includes(responseText)) {
            this._allResponses.push(responseText)
            this._allResponses.sort()
        }
    }
} 