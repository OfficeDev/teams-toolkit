import { Json } from "@microsoft/teamsfx-api";
import { compileHandlebarsTemplateString } from "../../../src";
import { ArmTemplateResult } from "../../../src/common/armInterface";

export function mockSolutionGenerateArmTemplates(
  mockedData: Json,
  template: ArmTemplateResult
): ArmTemplateResult {
  const result: ArmTemplateResult = {
    Configuration: {
      Orchestration: "",
      Modules: {},
    },
    Provision: {
      Orchestration: "",
      Reference: {},
      Modules: {},
    },
    Parameters: {},
  };
  if (template.Configuration) {
    if (template.Configuration.Orchestration) {
      result.Configuration!.Orchestration = compileHandlebarsTemplateString(
        template.Configuration.Orchestration,
        mockedData
      );
    }
    if (template.Configuration?.Modules) {
      for (const moduleItem of Object.entries(template.Configuration.Modules)) {
        result.Configuration!.Modules![moduleItem[0]] = compileHandlebarsTemplateString(
          moduleItem[1],
          mockedData
        );
      }
    }
  }
  if (template.Provision) {
    if (template.Provision?.Orchestration) {
      result.Provision!.Orchestration = compileHandlebarsTemplateString(
        template.Provision.Orchestration,
        mockedData
      );
    }
    result.Provision!.Reference = template.Provision?.Reference;
    if (template.Provision?.Modules) {
      for (const moduleItem of Object.entries(template.Provision!.Modules)) {
        result.Provision!.Modules![moduleItem[0]] = compileHandlebarsTemplateString(
          moduleItem[1],
          mockedData
        );
      }
    }
  }
  result.Parameters = template.Parameters;
  return result;
}

export function mockSolutionUpdateArmTemplates(
  mockedData: Json,
  template: ArmTemplateResult
): ArmTemplateResult {
  const result: ArmTemplateResult = {
    Configuration: {
      Modules: {},
    },
    Provision: {
      Reference: {},
    },
  };
  if (template.Configuration) {
    if (template.Configuration?.Modules) {
      for (const moduleItem of Object.entries(template.Configuration.Modules)) {
        result.Configuration!.Modules![moduleItem[0]] = compileHandlebarsTemplateString(
          moduleItem[1],
          mockedData
        );
      }
    }
  }
  if (template.Provision) {
    result.Provision!.Reference = template.Provision?.Reference;
  }
  return result;
}

export class ConstantString {
  static readonly UTF8Encoding = "utf-8";
}

export class ResourcePlugins {
  static readonly Aad = "fx-resource-aad-app-for-teams";
  static readonly FrontendHosting = "fx-resource-frontend-hosting";
  static readonly SimpleAuth = "fx-resource-simple-auth";
  static readonly Bot = "fx-resource-bot";
  static readonly LocalDebug = "fx-resource-local-debug";
  static readonly AzureSQL = "fx-resource-azure-sql";
  static readonly Function = "fx-resource-function";
  static readonly Identity = "fx-resource-identity";
  static readonly Apim = "fx-resource-apim";
}
