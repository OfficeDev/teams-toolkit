// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ArmTemplateResult } from "../armInterface";

export function mergeTemplates(templates: ArmTemplateResult[]): ArmTemplateResult {
  const result: ArmTemplateResult = {
    Provision: {
      Orchestration: templates.map((template) => template.Provision?.Orchestration).join(""),
      Modules: templates
        .map((template) => template.Provision?.Modules)
        .reduce((result, current) => Object.assign(result, current), {}),
    },
    Configuration: {
      Orchestration: templates.map((template) => template.Configuration?.Orchestration).join(""),
      Modules: templates
        .map((template) => template.Configuration?.Modules)
        .reduce((result, current) => Object.assign(result, current), {}),
    },
    Parameters: Object.assign({}, ...templates.map((template) => template.Parameters)),
    Reference: Object.assign({}, ...templates.map((template) => template.Reference)),
  };
  return result;
}
