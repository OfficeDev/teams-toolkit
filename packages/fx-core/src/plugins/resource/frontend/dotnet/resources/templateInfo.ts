export type TemplateVariable = { [key: string]: string };

export class TemplateInfo {
  group: string;
  language: string;
  scenario: string;
  variables: TemplateVariable;

  constructor(templateVariable: TemplateVariable, scenario?: string) {
    this.group = TemplateInfo.DefaultGroup;
    this.language = TemplateInfo.DonetLanguage;
    this.scenario = scenario ?? TemplateInfo.DefaultScenario;
    this.variables = templateVariable;
  }

  static readonly DefaultGroup = "tab";
  static readonly DonetLanguage = "csharp";
  static readonly DefaultScenario = "default";
  static readonly NoneSsoScenario = "non-sso";
}
