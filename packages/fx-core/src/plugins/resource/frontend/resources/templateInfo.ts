// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { PluginContext } from "fx-api";
import { DependentPluginInfo, FrontendPathInfo } from "../constants";

export class TabLanguage {
    static readonly JavaScript = "JavaScript";
    static readonly TypeScript = "TypeScript";
}

export class Scenario {
    static readonly Default = "default";
    static readonly WithFunction = "with-function";
}

export class TemplateInfo {
    group: string;
    language: string;
    scenario: string;
    version: string;
    localTemplatePath: string;

    constructor(ctx: PluginContext) {
        this.group = TemplateInfo.TemplateGroupName;
        this.version = TemplateInfo.version;

        const solutionPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.SolutionPluginName);
        const tabLanguage = solutionPlugin?.get(DependentPluginInfo.ProgrammingLanguage) as string ?? TabLanguage.JavaScript;
        this.language = this.validateTabLanguage(tabLanguage);

        const functionPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.FunctionPluginName);
        this.scenario = functionPlugin ? Scenario.WithFunction : Scenario.Default;

        const localTemplateFileName = [this.group, this.language, this.scenario].join(".") + FrontendPathInfo.TemplatePackageExt;
        this.localTemplatePath = path.join(FrontendPathInfo.TemplateDir, localTemplateFileName);
    }

    private validateTabLanguage(language: string): string {
        if (language.toLowerCase() === TabLanguage.JavaScript.toLowerCase()) {
            return TabLanguage.JavaScript;
        }

        if (language.toLowerCase() === TabLanguage.TypeScript.toLowerCase()) {
            return TabLanguage.TypeScript;
        }

        throw new Error();
    }

    static readonly TemplateGroupName = "tab";
    static readonly version = "0.3.x";
}
