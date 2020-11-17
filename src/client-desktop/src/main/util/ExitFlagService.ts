import { AuthenticationService } from "../../services/auth/AuthenticationService";

/**
 * Lets us know when it's OK to exit the process when all windows are closed.
 */
export class ExitFlagService {
    constructor(authService: AuthenticationService) {
        this._authService = authService
    }

    canExit() : boolean {
        return !(this._authService.isLoggedIn()
                || this._authService.isLoggingIn()
                || this._authService.isLoggingOut())
    }

    // ================= Private ==================
    private _authService : AuthenticationService
}