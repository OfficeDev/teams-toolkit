import { PluginContext } from "@microsoft/teamsfx-api";
import { templatesVersion } from "../../../../../common/template-utils/templates";

export type TemplateVariable = { [key: string]: string };

export class Group {
    static readonly Tab = "tab";
    static readonly Bot = "bot";
    static readonly Base = "blazor-base";
}

export class Scenario {
    static readonly Default = "default";
    static readonly Tab = "tab";
    static readonly Bot = "bot";
    static readonly TabAndBot = "tabbot";
}

export class TemplateInfo {
    group: string;
    language: string;
    scenario: string;
    version: string;
    variables: TemplateVariable;

    constructor(ctx: PluginContext, group: string, scenario: string) {
        this.group = group;
        this.version = TemplateInfo.version;
        this.language = TemplateInfo.DonetLanguage;

        const appName = ctx.projectSettings!.appName;
        this.variables = {
            BlazorAppServer: appName,
        };

        this.scenario = scenario;
    }

    static readonly DonetLanguage = "csharp";
    static readonly version = templatesVersion;
}
