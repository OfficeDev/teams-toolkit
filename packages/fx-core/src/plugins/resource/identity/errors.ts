export class ErrorMessage {
    public static readonly IdentityLoadFileError = {
        name: "IdentityLoadFileError",
        message: () => "load arm template files failed"
    };

    public static readonly IdentityProvisionError = {
        name: "IdentityProvisionError",
        message: (identity: string) => `provision identity ${identity} failed`
    };
}
