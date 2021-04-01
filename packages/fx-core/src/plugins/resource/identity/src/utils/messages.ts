import { Constants } from "../constants";

export class Message {
    public static readonly startProvision = `[${Constants.pluginName}] start provision`;
    public static readonly endProvision = `[${Constants.pluginName}] end provision`;
    public static readonly provisionIdentity = `[${Constants.pluginName}] provision identity`;
    public static readonly getIdentityId = `[${Constants.pluginName}] get identity id`;

    public static readonly identityName = (name: string) => `[${Constants.pluginName}] identity name is ${name}`;

}