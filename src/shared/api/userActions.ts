import { sendPost } from "./restActions";
import { SignUpRequest } from "./SignUpRequest";

export function signUp(signUpRequest: SignUpRequest) : Promise<void> {
    return sendPost('/api/signup', signUpRequest)
}