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

  static readonly SupportCapability = [Capability.tab, Capability.bot];
  static readonly DonetLanguage = "csharp";
  static readonly DefaultScenario = "default";
  static readonly BaseGroup = "blazor-base";
  static readonly version = templatesVersion;
}

export function generateTemplateInfos(selectedCapabilities: string[], ctx: PluginContext) {
  const projectName = ctx.projectSettings!.appName;
  const templateVariable: TemplateVariable = { BlazorAppServer: projectName };
  const templateInfoList: TemplateInfo[] = [];

  selectedCapabilities.forEach((capability) => {
    if (capability in TemplateInfo.SupportCapability) {
      templateInfoList.push(new TemplateInfo(ctx, capability.toLowerCase(), templateVariable));
    }
  });

  // Generate templateInfo for base scenrio.
  if (selectedCapabilities.includes(Capability.tab)) {
    templateVariable.IS_TAB = "true";
  }
  if (selectedCapabilities.includes(Capability.bot)) {
    templateVariable.IS_BOT = "true";
  }
  const baseTemplateInfo = new TemplateInfo(ctx, TemplateInfo.BaseGroup, templateVariable);
  templateInfoList.push(baseTemplateInfo);

  return templateInfoList;
}
