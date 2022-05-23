// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
  genTemplateRenderReplaceFn,
} from "../../../../common/template-utils/templatesActions";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";
import { TemplateZipFallbackError, UnzipError } from "../errors";
import { Logger } from "../logger";
import { Messages } from "../resources/messages";

export async function scaffold(template: CodeTemplateInfo, dst: string): Promise<void> {
  return await scaffoldFromTemplates({
    group: template.group,
    lang: template.language,
    scenario: template.scenario,
    dst: dst,
    fileNameReplaceFn: genTemplateNameRenderReplaceFn(template.variables.ProjectName),
    fileDataReplaceFn: genTemplateRenderReplaceFn(template.variables),
    onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
      if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
        Logger.info(Messages.SuccessfullyRetrievedTemplateZip(context.zipUrl ?? ""));
      }
    },
    onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
      Logger.error(error.toString());
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

export function genTemplateNameRenderReplaceFn(appName: string) {
  return (name: string, data: Buffer): string => {
    return name.replace(/ProjectName/, appName).replace(/\.tpl/, "");
  };
}
