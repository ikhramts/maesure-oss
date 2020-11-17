import { ICredentialsProvider } from "shared/api/ICredentialsProvider";
import { AuthenticationService } from "client/services/auth/AuthenticationService";

/**
 * Adds credentials to ApiClient requests in the Electron's Main process.
 * Adds JWT access tokens, which it gets from the AuthenticationService.
 */
export class MainProcessCredentialsProvider implements ICredentialsProvider {
    constructor(authService: AuthenticationService) {
        this._authService = authService
    }

    async addCredentials(request: RequestInit): Promise<RequestInit> {
        const accessToken = this._authService.getAccessToken()       
        
        if (!request.headers) {
            request.headers = {}
        }
        
        const headers = request.headers as Record<string, string>
        headers['Authorization'] = `Bearer ${accessToken}`

        return request;
    }

    // ==================== Private ===================
    private _authService: AuthenticationService
}