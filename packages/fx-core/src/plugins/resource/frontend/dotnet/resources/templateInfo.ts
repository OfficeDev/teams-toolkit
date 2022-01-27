import { PluginContext } from "@microsoft/teamsfx-api";
import { templatesVersion } from "../../../../../common/template-utils/templates";

export type TemplateVariable = { [key: string]: string };

export class Group {
  static readonly Tab = "tab";
  static readonly Bot = "bot";
  static readonly Base = "blazor-base";
}

export class TemplateInfo {
  group: string;
  language: string;
  scenario: string;
  version: string;
  variables: TemplateVariable;

  constructor(ctx: PluginContext, group: string, templateVariable: TemplateVariable) {
    this.group = group;
    this.version = TemplateInfo.version;
    this.language = TemplateInfo.DonetLanguage;
    this.variables = templateVariable;
    this.scenario = TemplateInfo.DefaultScenario;
  }

  static readonly DonetLanguage = "csharp";
  static readonly DefaultScenario = "default";
  static readonly version = templatesVersion;
}
