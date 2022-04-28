// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ScaffoldAction,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/template-utils/templatesActions";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";

export async function scaffold(template: CodeTemplateInfo, dst: string): Promise<void> {
  return await scaffoldFromTemplates({
    group: template.group,
    lang: template.language,
    scenario: template.scenario,
    dst: dst,
    onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
      // TODO
    },
    onActionError: async (action: ScaffoldAction, context: ScaffoldContext) => {
      // TODO
    },
  });
}
