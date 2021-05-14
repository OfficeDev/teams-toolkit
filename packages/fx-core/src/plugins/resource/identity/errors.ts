export class ErrorMessage {
  public static readonly IdentityLoadFileError = {
    name: "IdentityLoadFileError",
    message: () => "Failed to load Azure Resource Manager template files.",
  };

  public static readonly IdentityProvisionError = {
    name: "IdentityProvisionError",
    message: (identity: string) => `Failed to provision identity '${identity}'.`,
  };
}
