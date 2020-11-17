export interface PollUpdateRequest {
    activeFrom?: string,
    activeTo?: string,
    desiredFrequencyMin?: number
    wasStarted?: boolean
    startedAt?: Date
}