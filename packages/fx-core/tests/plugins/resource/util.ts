import { compileHandlebarsTemplateString } from "../../../src";
import { ScaffoldArmTemplateResult } from "../../../src/common/armInterface";

export function mockSolutionUpdateArmTemplates(
  mockedData: any,
  template: ScaffoldArmTemplateResult
): ScaffoldArmTemplateResult {
  return {
    Modules: template.Modules,
    Orchestration: {
      ParameterTemplate: {
        Content: compileHandlebarsTemplateString(
          template.Orchestration.ParameterTemplate!.Content,
          mockedData
        ),
      },
      ModuleTemplate: {
        Content: compileHandlebarsTemplateString(
          template.Orchestration.ModuleTemplate.Content,
          mockedData
        ),
        Outputs: template.Orchestration.ModuleTemplate.Outputs,
      },
      OutputTemplate: {
        Content: compileHandlebarsTemplateString(
          template.Orchestration.OutputTemplate!.Content,
          mockedData
        ),
      },
    },
  } as ScaffoldArmTemplateResult;
}
