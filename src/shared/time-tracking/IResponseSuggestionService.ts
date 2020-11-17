export interface IResponseSuggestionService {
    suggestResponses(partialResponse: string) : Promise<string[]>
}