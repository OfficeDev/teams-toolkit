import { Json } from "@microsoft/teamsfx-api";
import { compileHandlebarsTemplateString } from "../../../src";
import { ScaffoldArmTemplateResult } from "../../../src/common/armInterface";

export function mockSolutionUpdateArmTemplates(
  mockedData: Json,
  template: ScaffoldArmTemplateResult
): ScaffoldArmTemplateResult {
  const result = {
    Modules: template.Modules,
    Orchestration: {
      ModuleTemplate: {
        Content: compileHandlebarsTemplateString(
          template.Orchestration.ModuleTemplate.Content,
          mockedData
        ),
        Outputs: template.Orchestration.ModuleTemplate.Outputs,
      },
    },
  } as ScaffoldArmTemplateResult;

  if (template.Orchestration.OutputTemplate) {
    result.Orchestration.OutputTemplate = {
      Content: compileHandlebarsTemplateString(
        template.Orchestration.OutputTemplate.Content,
        mockedData
      ),
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
      result.Orchestration.ParameterTemplate.ParameterFile = compileHandlebarsTemplateString(
        template.Orchestration.ParameterTemplate.ParameterFile,
        mockedData
      );
    }
  }

  return result;
}
