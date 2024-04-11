import { OpenAPIV3 } from "openapi-types";
import { ParseOptions, ProjectType } from "../interfaces";
import { CopilotValidator } from "./copilotValidator";
import { SMEValidator } from "./smeValidator";
import { TeamsAIValidator } from "./teamsAIValidator";
import { Validator } from "./validator";

export class ValidatorFactory {
  static create(spec: OpenAPIV3.Document, options: ParseOptions): Validator {
    const type = options.projectType ?? ProjectType.SME;

    switch (type) {
      case ProjectType.SME:
        return new SMEValidator(spec, options);
      case ProjectType.Copilot:
        return new CopilotValidator(spec, options);
      case ProjectType.TeamsAi:
        return new TeamsAIValidator(spec, options);
      default:
        throw new Error(`Invalid project type: ${type}`);
    }
  }
}
