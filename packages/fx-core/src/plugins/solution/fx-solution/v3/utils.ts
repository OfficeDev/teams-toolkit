import { v3 } from "@microsoft/teamsfx-api";
import { isNumber } from "lodash";

export function getModule(
  solutionSettings: v3.TeamsFxSolutionSettings,
  module?: string
): v3.Module | undefined {
  if (!isNumber(Number(module))) {
    return undefined;
  }
  const index = Number(module);
  if (index >= 0 && index < solutionSettings.modules.length) {
    return solutionSettings.modules[index];
  }
  return undefined;
}
