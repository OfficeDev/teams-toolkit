export class TreatmentVariables {
  public static readonly VSCodeConfig = "vscode";
  public static readonly EmbeddedSurvey = "embeddedsurvey";
  public static readonly CustomizeTreeview = "customizetreeview";
  public static readonly WelcomeView = "welcomeview";
  public static readonly TaskOrientedTemplateNaming = "taskOrientedTemplateNaming";
}

export class TreatmentVariableValue {
  public static welcomeViewStyle: string | undefined = undefined;
  // If this is true, user will see a different display title/description
  // for notification/command/workflow bot during scaffolding.
  public static taskOrientedTemplateNaming: boolean | undefined = undefined;
}
