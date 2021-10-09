import { Constants } from "../constants";

export class Message {
  public static readonly startProvision = `[${Constants.pluginName}] start provision`;
  public static readonly endProvision = `[${Constants.pluginName}] end provision`;
  public static readonly provisionIdentity = `[${Constants.pluginName}] provision identity`;
  public static readonly getIdentityId = `[${Constants.pluginName}] get identity id`;
  public static readonly checkProvider = `[${Constants.pluginName}] check identity resource provider`;

  public static readonly identityResourceId = (name: string) =>
    `[${Constants.pluginName}] identity resource id is ${name}`;

  public static readonly registerResourceProviderFailed = (message: string) =>
    `[${Constants.pluginName}] Failed to register identity resource provider. Reason: ${message}.`;
}
