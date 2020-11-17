import { User } from "shared/model/User";
import { Poll } from "shared/model/Poll";

export class CreateTempAccountResult {
    user: User = new User()
    defaultPoll: Poll = new Poll()

    constructor(init?: Partial<CreateTempAccountResult>) {
        if (!init) return

        if (init.user)
            this.user = new User(init.user)

        if (init.defaultPoll)
            this.defaultPoll = new Poll(init.defaultPoll)
    }
}