// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";

export type AppSettings = { [key: string]: string };

export class CodeTemplateProvider {
  static getTemplates(ctx: Context, inputs: Inputs): CodeTemplateInfo[] {
    // language and scenario
    return [
      {
        group: "bot",
        language: this.validateProgrammingLanguage(ctx.projectSetting.programmingLanguage),
        scenario: this.resolveScenario(ctx, inputs),
        version: "0.1.0",
        localTemplateBaseName: "",
        localTemplatePath: "",
        variables: {},
      },
    ];
  }

  private static resolveScenario(ctx: Context, inputs: Inputs): string {
    return "default";
  }

  private static validateProgrammingLanguage(lang?: string): string {
    switch (lang?.toLocaleLowerCase()) {
      case "javascript":
        return "js";
      case "typescript":
        return "ts";
      case "csharp":
        return "csharp";
    }
    throw new Error("Invalid programming language");
  }

  static getConfigurations(ctx: Context, inputs: Inputs): AppSettings {
    // language and scenario
    return { WEBSITE_NODE_DEFAULT_VERSION: "~14" };
  }

  static getConfigurationBiceps(ctx: Context, inputs: Inputs): string[] {
    // language and scenario
    return ["webappProvision.node.template.bicep", "webappConfiguration.node.template.bicep"];
  }

  static getBuiltArtifact(ctx: Context, inputs: Inputs) {}
}
