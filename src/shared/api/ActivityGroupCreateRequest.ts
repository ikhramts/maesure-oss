export interface ActivityGroupCreateRequest {
    name: string

    // Should provide one of these but not both.
    parentId?: string
    parentMatchResponseText?: string

    // Can be provided only if providing parentMatchResponseText.
    grandparentId?: string
}