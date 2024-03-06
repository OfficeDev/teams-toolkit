// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok, err, TeamsAppManifest, ManifestUtil } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { Service } from "typedi";
import fs from "fs-extra";
import * as path from "path";
import { merge } from "lodash";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { ValidateWithTestCasesArgs } from "./interfaces/ValidateWithTestCasesArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { AppStudioClient } from "./clients/appStudioClient";
import { getLocalizedString } from "../../../common/localizeUtils";
import { AppStudioScopes } from "../../../common/tools";
import AdmZip from "adm-zip";
import { Constants, getAppStudioEndpoint } from "./constants";
import { metadataUtil } from "../../utils/metadataUtil";
import { FileNotFoundError, InvalidActionInputError } from "../../../error/common";
import { AsyncAppValidationResponse } from "./interfaces/AsyncAppValidationResponse";

const actionName = "teamsApp/validateWithTestCases";

@Service(actionName)
export class ValidateWithTestCasesDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.validateWithTestCasesDriver");

  public async execute(
    args: ValidateWithTestCasesArgs,
    context: DriverContext
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.validate(args, wrapContext);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async validate(
    args: ValidateWithTestCasesArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }

    let appPackagePath = args.appPackagePath;
    if (!path.isAbsolute(appPackagePath)) {
      appPackagePath = path.join(context.projectPath, appPackagePath);
    }
    if (!(await fs.pathExists(appPackagePath))) {
      return err(new FileNotFoundError(actionName, appPackagePath));
    }

    const archivedFile = await fs.readFile(appPackagePath);

    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (manifestFile) {
      const manifestContent = manifestFile.getData().toString();
      const manifest = JSON.parse(manifestContent) as TeamsAppManifest;
      metadataUtil.parseManifest(manifest);

      // Add common properties like isCopilotPlugin: boolean
      const manifestTelemetries = ManifestUtil.parseCommonTelemetryProperties(manifest);
      merge(context.telemetryProperties, manifestTelemetries);

      const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        return err(appStudioTokenRes.error);
      }
      const appStudioToken = appStudioTokenRes.value;

      const response: AsyncAppValidationResponse = await AppStudioClient.submitAppValidationRequest(
        manifest.id,
        appStudioToken
      );
      const url = `${getAppStudioEndpoint()}/apps/${manifest.id}/app-validation/${
        response.appValidationId
      }`;
      const message = getLocalizedString("AppStudio.asyncValidationMessage", response.status, url);
      context.logProvider?.info(message);
      return ok(new Map());
    } else {
      return err(new FileNotFoundError(actionName, "manifest.json"));
    }
  }

  private validateArgs(args: ValidateWithTestCasesArgs): Result<any, FxError> {
    if (!args || !args.appPackagePath) {
      return err(new InvalidActionInputError(actionName, ["appPackagePath"]));
    }
    return ok(undefined);
  }
}
