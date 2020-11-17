export interface ICredentialsProvider {
    addCredentials(request: RequestInit) : Promise<RequestInit>
}