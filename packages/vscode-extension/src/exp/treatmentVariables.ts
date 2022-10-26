export class TreatmentVariables {
  public static readonly VSCodeConfig = "vscode";
  public static readonly EmbeddedSurvey = "embeddedsurvey";
  public static readonly CustomizeTreeview = "customizetreeview";
  public static readonly WelcomeView = "welcomeview";
}

export class TreatmentVariableValue {
  public static isEmbeddedSurvey: boolean | undefined = undefined;
  public static welcomeViewStyle: string | undefined = undefined;
}
