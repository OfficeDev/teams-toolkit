export class TreatmentVariables {
  public static readonly VSCodeConfig = "vscode";
  public static readonly TreeView = "treeview";
  public static readonly DynamicTreeView = "dynamictreeview";
  public static readonly ExpandCreateCard = "expandcreatecard";
  public static readonly SidebarWelcome = "sidebarwelcome";
  public static readonly EmbeddedSurvey = "embeddedsurvey";
}

export class TreatmentVariableValue {
  public static isExpandCard: boolean | undefined = undefined;
  public static isEmbeddedSurvey: boolean | undefined = undefined;
}
