// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TemplateZipFallbackError,
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../../resources/errors";
import { Constants } from "../constants";
import { Logger } from "../../utils/logger";
import { Messages } from "../resources/messages";
import { TelemetryHelper } from "../../utils/telemetry-helper";
import {
  genTemplateRenderReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../../common/template-utils/templatesActions";
import { TemplateInfo } from "../resources/templateInfo";

export async function scaffoldFromZipPackage(
  componentPath: string,
  templateInfo: TemplateInfo
): Promise<void> {
  await scaffoldFromTemplates({
    group: templateInfo.group,
    lang: templateInfo.language,
    scenario: templateInfo.scenario,
    dst: componentPath,
    fileNameReplaceFn: genTemplateNameRenderReplaceFn(templateInfo.variables.ProjectName),
    fileDataReplaceFn: genTemplateRenderReplaceFn(templateInfo.variables),
    onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
      if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
        Logger.info(Messages.getTemplateFrom(context.zipUrl ?? Constants.emptyString));
      }
    },
    onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
      Logger.info(error.toString());
      switch (action.name) {
        case ScaffoldActionName.FetchTemplatesUrlWithTag:
        case ScaffoldActionName.FetchTemplatesZipFromUrl:
          TelemetryHelper.sendScaffoldFallbackEvent(error.message);
          Logger.info(Messages.FailedFetchTemplate);
          break;
        case ScaffoldActionName.FetchTemplateZipFromLocal:
          throw new TemplateZipFallbackError();
        case ScaffoldActionName.Unzip:
          throw new UnzipTemplateError();
        default:
          throw new UnknownScaffoldError();
      }
    },
  });
}

export function renderTemplateName(name: string, data: Buffer, appName: string): string {
  return name.replace(/ProjectName/, appName).replace(/\.tpl/, "");
}

export function genTemplateNameRenderReplaceFn(appName: string) {
  return (name: string, data: Buffer): string => renderTemplateName(name, data, appName);
}
