export interface ActivityGroupMoveRequest {
    // Should provide one of these but not both.
    id?: string
    matchResponseText?: string

    // New parent information.
    targetParentId?: string
    targetParentMatchResponseText?: string
    targetGrandparentId?: string

    // Can provide this only if new parent info is not present.
    targetIsUncategorized?: boolean
}