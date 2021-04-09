// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { PluginContext } from "fx-api";
import { DependentPluginInfo, FrontendPathInfo } from "../constants";
import { QuestionKey } from "./questions";

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
        this.language = (ctx.answers?.getString(QuestionKey.TabLanguage)) ?? TabLanguage.JavaScript;
        this.version = TemplateInfo.versions[this.language];

        const functionPlugin = ctx.configOfOtherPlugins.get(DependentPluginInfo.FunctionPluginName);
        this.scenario = functionPlugin ? Scenario.WithFunction : Scenario.Default;
        // local template package only for default scenario
        const localTemplateFileName = [this.group, this.language, Scenario.Default].join(".");
        this.localTemplatePath = path.join(FrontendPathInfo.TemplateDir, localTemplateFileName + FrontendPathInfo.TemplatePackageExt);
    }

    static readonly TemplateGroupName = "tab";
    static readonly versions: { [key: string]: string } = {
        "JavaScript": "0.2.x",
        "TypeScript": "0.1.x",
    };
}