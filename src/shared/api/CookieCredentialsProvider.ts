import { ICredentialsProvider } from "./ICredentialsProvider";

export class CookieCredentialsProvider implements ICredentialsProvider {
    addCredentials(request: RequestInit): Promise<RequestInit> {
        request.credentials = 'include'
        return Promise.resolve(request)
    }

}