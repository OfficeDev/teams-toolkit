import { Json } from "@microsoft/teamsfx-api";
import { compileHandlebarsTemplateString } from "../../../src";
import { ScaffoldArmTemplateResult } from "../../../src/common/armInterface";

export function mockSolutionUpdateArmTemplates(
  mockedData: Json,
  template: ScaffoldArmTemplateResult
): ScaffoldArmTemplateResult {
  const result: ScaffoldArmTemplateResult = {
    Orchestration: {},
  };

  if (template.Modules) {
    result.Modules = template.Modules;
  }

  if (template.Orchestration.ModuleTemplate) {
    result.Orchestration.ModuleTemplate = {
      Content: compileHandlebarsTemplateString(
        template.Orchestration.ModuleTemplate.Content,
        mockedData
      ),
    };
  }

  if (template.Orchestration.OutputTemplate) {
    result.Orchestration.OutputTemplate = {
      Content: template.Orchestration.OutputTemplate.Content,
    };
  }

  if (template.Orchestration.VariableTemplate) {
    result.Orchestration.VariableTemplate = {
      Content: compileHandlebarsTemplateString(
        template.Orchestration.VariableTemplate.Content,
        mockedData
      ),
    };
  }

  if (template.Orchestration.ParameterTemplate) {
    result.Orchestration.ParameterTemplate = {
      Content: compileHandlebarsTemplateString(
        template.Orchestration.ParameterTemplate.Content,
        mockedData
      ),
    };

    if (template.Orchestration.ParameterTemplate.ParameterFile) {
      result.Orchestration.ParameterTemplate.ParameterFile =
        template.Orchestration.ParameterTemplate.ParameterFile;
    }
  }

  return result;
}

export class ConstantString {
  static readonly UTF8Encoding = "utf-8";
}
