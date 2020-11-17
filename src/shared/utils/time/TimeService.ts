import { ITimeService } from "./ITimeService";

export class TimeService implements ITimeService {
    now() {
        return new Date()
    }
}