// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { PluginContext } from "fx-api";
import { DependentPluginInfo, FrontendPathInfo } from "../constants";
import { QuestionKey } from "./questions";
import { TSTemplateNotReadyError } from "./errors";

export class TabLanguage {
    static readonly JavaScript = "javascript";
    static readonly TypeScript = "typescript";
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

        const solutionPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.SolutionPluginName);
        this.language = solutionPlugin?.get(DependentPluginInfo.ProgrammingLanguage) as string ?? TabLanguage.JavaScript;
        //TODO: Throw error until TS template ready
        if (this.language === TabLanguage.TypeScript) {
            throw new TSTemplateNotReadyError();
        }
        this.version = TemplateInfo.version;

        const functionPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.FunctionPluginName);
        this.scenario = functionPlugin ? Scenario.WithFunction : Scenario.Default;

        // local template package only for default scenario
        const localTemplateFileName = [this.group, this.language, Scenario.Default].join(".") + FrontendPathInfo.TemplatePackageExt;
        this.localTemplatePath = path.join(FrontendPathInfo.TemplateDir, localTemplateFileName);
    }

    static readonly TemplateGroupName = "tab";
    static readonly version = "0.2.x";
}
