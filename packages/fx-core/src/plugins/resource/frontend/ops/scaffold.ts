// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TemplateManifestError,
  TemplateZipFallbackError,
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../resources/errors";
import { FrontendPathInfo as PathInfo } from "../constants";
import { Logger } from "../utils/logger";
import { Messages } from "../resources/messages";
import { TemplateInfo } from "../resources/templateInfo";
import { TelemetryHelper } from "../utils/telemetry-helper";
import {
  genTemplateRenderReplaceFn,
  removeTemplateExtReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/templatesActions";

export type Manifest = {
  [key: string]: {
    [key: string]: {
      [key: string]: {
        version: string;
        url: string;
      }[];
    };
  };
};

export class FrontendScaffold {
  public static async scaffoldFromZipPackage(
    componentPath: string,
    templateInfo: TemplateInfo
  ): Promise<void> {
    await scaffoldFromTemplates({
      group: templateInfo.group,
      lang: templateInfo.language,
      scenario: templateInfo.scenario,
      templatesFolderName: PathInfo.TemplateFolderName,
      dst: componentPath,
      fileNameReplaceFn: removeTemplateExtReplaceFn,
      fileDataReplaceFn: genTemplateRenderReplaceFn(templateInfo.variables),
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        Logger.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            TelemetryHelper.sendScaffoldFallbackEvent(new TemplateManifestError(error.message));
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
}
