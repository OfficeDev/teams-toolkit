export class TreatmentVariables {
  public static readonly VSCodeConfig = "vscode";
  public static readonly EmbeddedSurvey = "embeddedsurvey";
  public static readonly CustomizeTreeview = "customizetreeview";
  public static readonly OpenFolderInNewWindow = "openfolderinnewwindow";
}

export class TreatmentVariableValue {
  public static isEmbeddedSurvey: boolean | undefined = undefined;
  // If this is true, users can choose to open in current window or new window(default) after creating a new project.
  public static openFolderInNewWindow: boolean | undefined = undefined;
}
