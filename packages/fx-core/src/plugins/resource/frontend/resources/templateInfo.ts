// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
import { DependentPluginInfo, FrontendPathInfo } from "../constants";
import { InvalidTabLanguageError } from "./errors";
import { getTemplatesFolder } from "../../../../folder";
import { templatesVersion } from "../../../../common/template-utils/templates";
import { isAadManifestEnabled } from "../../../../common/tools";
import { TabSsoItem } from "../../../solution/fx-solution/question";

export type TemplateVariable = { [key: string]: string };

export enum TabLanguage {
  JavaScript = "javascript",
  TypeScript = "typescript",
  CSharp = "csharp",
}

export class Scenario {
  static readonly Default = "default";
  static readonly WithFunction = "with-function";
  static readonly NonSso = "non-sso";
  static readonly M365 = "m365";
}

export class TemplateInfo {
  group: string;
  language: string;
  scenario: string;
  version: string;
  localTemplateBaseName: string;
  localTemplatePath: string;
  variables: TemplateVariable;

  constructor(ctx: PluginContext) {
    this.group = TemplateInfo.TemplateGroupName;
    this.version = TemplateInfo.version;

    const tabLanguage =
      (ctx.projectSettings?.programmingLanguage as string) ?? TabLanguage.JavaScript;
    this.language = this.validateTabLanguage(tabLanguage);

    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    const isFunctionPlugin = selectedPlugins.some(
      (pluginName) => pluginName === DependentPluginInfo.FunctionPluginName
    );
    this.variables = {
      showFunction: isFunctionPlugin.toString(),
    };

    const capabilities = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      ?.capabilities;

    this.scenario = ctx.projectSettings?.isM365
      ? Scenario.M365
      : isAadManifestEnabled() && !capabilities.includes(TabSsoItem.id)
      ? Scenario.NonSso
      : Scenario.Default;

    this.localTemplateBaseName = [this.group, this.language, this.scenario].join(".");
    this.localTemplatePath = path.join(
      getTemplatesFolder(),
      FrontendPathInfo.TemplateRelativeDir,
      this.localTemplateBaseName + FrontendPathInfo.TemplatePackageExt
    );
  }

  private validateTabLanguage(language: string): string {
    if (language.toLowerCase() === TabLanguage.JavaScript) {
      return "js";
    }

    if (language.toLowerCase() === TabLanguage.TypeScript) {
      return "ts";
    }

    throw new InvalidTabLanguageError();
  }

  static readonly TemplateGroupName = "tab";
  static readonly version = templatesVersion;
}
