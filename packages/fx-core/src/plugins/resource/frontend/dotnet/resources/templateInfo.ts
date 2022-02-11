import { PluginContext } from "@microsoft/teamsfx-api";
import { Capability } from "./../constants";
import { templatesVersion } from "../../../../../common/template-utils/templates";

export type TemplateVariable = { [key: string]: string };

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

  static readonly SupportedCapabilities = new Map<string, string>([
    [Capability.tab, "IS_TAB"],
    [Capability.bot, "IS_BOT"],
  ]);
  static readonly DonetLanguage = "csharp";
  static readonly DefaultScenario = "default";
  static readonly BaseGroup = "blazor-base";
  static readonly version = templatesVersion;
}

export function generateTemplateInfos(
  selectedCapabilities: string[],
  ctx: PluginContext
): TemplateInfo[] {
  const projectName = ctx.projectSettings!.appName;
  const templateVariable: TemplateVariable = { BlazorAppServer: projectName };
  const templateInfoList: TemplateInfo[] = [];
  const variables: string[] = [];

  selectedCapabilities.forEach((capability) => {
    if (TemplateInfo.SupportedCapabilities.has(capability)) {
      templateInfoList.push(new TemplateInfo(ctx, capability.toLowerCase(), templateVariable));
      variables.push(TemplateInfo.SupportedCapabilities.get(capability)!);
    }
  });

  // Generate templateInfo for base scenrio. Add variables into templateVariable
  variables.forEach((v) => (templateVariable[v] = "true"));
  const baseTemplateInfo = new TemplateInfo(ctx, TemplateInfo.BaseGroup, templateVariable);
  templateInfoList.push(baseTemplateInfo);

  return templateInfoList;
}
