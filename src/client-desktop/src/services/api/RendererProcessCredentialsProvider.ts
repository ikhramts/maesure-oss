import { ICredentialsProvider } from "shared/api/ICredentialsProvider";
import { AuthenticationProxy } from "client/services/auth/AuthenticationProxy";

/**
 * Provides credentials to ApiClient in the renderer process. 
 * For each request, this credentials provider will grab the credentials via
 * Electron IPC from the Main Process's AuthenticationService.
 */
export class RendererProcessCredentialsProvider implements ICredentialsProvider {
    constructor(authenticationProxy: AuthenticationProxy) {
        this._authenticationProxy = authenticationProxy
    }

    async addCredentials(request: RequestInit): Promise<RequestInit> {
        const accessToken = await this._authenticationProxy.getAccessToken()        
        
        if (!request.headers) {
            request.headers = {}
        }
        
        const headers = request.headers as Record<string, string>
        headers['Authorization'] = `Bearer ${accessToken}`

        return request;
    }

    // ================= Private ===================
    private _authenticationProxy: AuthenticationProxy
}