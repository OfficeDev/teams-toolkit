export class Constants {
    public static readonly pluginName: string = "Identity Plugin";
    public static readonly pluginNameShort: string = "msi";
    public static readonly prefix: string = "teamsfx"

    public static readonly apiVersion: string = "2018-11-30";
    public static readonly deployName: string = "user-assigned-identity";

    public static readonly identityName: string = "identityName";
    public static readonly identityId: string = "identityId";
    public static readonly identity: string = "identity";

    public static readonly solution: string = "solution";
    public static readonly subscriptionId: string = "subscriptionId";
    public static readonly resourceGroupName: string = "resourceGroupName";
    public static readonly resourceNameSuffix: string = "resourceNameSuffix";
    public static readonly location: string = "location";
}

export class Telemetry {
    static readonly telemetryName = `${Constants.prefix}-resource-identity`;
    static readonly provisionStart = `${Telemetry.telemetryName}/provision-start`;
    static readonly provisionEnd = `${Telemetry.telemetryName}/provision`;

    static readonly component = "component";
    static readonly success = "success";
    static readonly errorType = "error-type";
    static readonly errorMessage = "error-message";

    static readonly getErrorProperty = (errorType: string, errorMessage: string) => {
        return {
            "error-type": errorType,
            "error-message": errorMessage,
        };
    };
}