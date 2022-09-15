import { Json } from "@microsoft/teamsfx-api";
import { compileHandlebarsTemplateString } from "../../../src/common/tools";
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
      Modules: {},
    },
    Reference: {},
    Parameters: {},
  };
  if (template.Configuration) {
    if (template.Configuration.Orchestration) {
      result.Configuration!.Orchestration = compileHandlebarsTemplateString(
        template.Configuration.Orchestration,
        mockedData.Plugins
      );
    }
    if (template.Configuration?.Modules) {
      for (const moduleItem of Object.entries(template.Configuration.Modules)) {
        result.Configuration!.Modules![moduleItem[0]] = compileHandlebarsTemplateString(
          moduleItem[1],
          mockedData.Plugins
        );
      }
    }
  }
  if (template.Provision) {
    if (template.Provision?.Orchestration) {
      result.Provision!.Orchestration = compileHandlebarsTemplateString(
        template.Provision.Orchestration,
        mockedData.Plugins
      );
    }
    if (template.Provision?.Modules) {
      for (const moduleItem of Object.entries(template.Provision!.Modules)) {
        result.Provision!.Modules![moduleItem[0]] = compileHandlebarsTemplateString(
          moduleItem[1],
          mockedData.Plugins
        );
      }
    }
  }
  result.Reference = template.Reference;
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
    Reference: {},
  };
  if (template.Configuration) {
    if (template.Configuration?.Modules) {
      for (const moduleItem of Object.entries(template.Configuration.Modules)) {
        result.Configuration!.Modules![moduleItem[0]] = compileHandlebarsTemplateString(
          moduleItem[1],
          mockedData.Plugins
        );
      }
    }
  }
  if (template.Reference) {
    result.Reference = template.Reference;
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
  static readonly KeyVault = "fx-resource-key-vault";
}
