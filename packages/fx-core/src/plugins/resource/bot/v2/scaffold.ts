// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  defaultActionSeq,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/template-utils/templatesActions";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";
import { CommandExecutionError, TemplateZipFallbackError, UnzipError } from "../errors";
import { Logger } from "../logger";
import { Messages } from "../resources/messages";

export async function scaffold(template: CodeTemplateInfo, dst: string): Promise<void> {
  return await scaffoldFromTemplates({
    group: template.group,
    lang: template.language,
    scenario: template.scenario,
    dst: dst,
    onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
      if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
        Logger.info(Messages.SuccessfullyRetrievedTemplateZip(context.zipUrl ?? ""));
      }
    },
    onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
      Logger.info(error.toString());
      switch (action.name) {
        case ScaffoldActionName.FetchTemplatesUrlWithTag:
        case ScaffoldActionName.FetchTemplatesZipFromUrl:
          Logger.info(Messages.FallingBackToUseLocalTemplateZip);
          break;
        case ScaffoldActionName.FetchTemplateZipFromLocal:
          throw new TemplateZipFallbackError();
        case ScaffoldActionName.Unzip:
          throw new UnzipError(context.dst);
        default:
          throw new Error(error.message);
      }
    },
  });
}
