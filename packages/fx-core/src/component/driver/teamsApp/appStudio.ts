// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AppPackageFolderName,
  BuildFolderName,
  err,
  FxError,
  InputsWithProjectPath,
  M365TokenProvider,
  ok,
  Result,
  TeamsAppManifest,
  UserError,
  LogProvider,
  Platform,
  Colors,
  ManifestUtil,
  Context,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import * as path from "path";
import _ from "lodash";
import * as util from "util";
import isUUID from "validator/lib/isUUID";
import { Container } from "typedi";
import { AppStudioScopes } from "../../../common/tools";
import { AppStudioClient } from "./clients/appStudioClient";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { manifestUtils } from "./utils/ManifestUtils";
import { Constants, supportedLanguageCodes } from "./constants";
import { CreateAppPackageDriver } from "./createAppPackage";
import { ConfigureTeamsAppDriver } from "./configure";
import { CreateAppPackageArgs } from "./interfaces/CreateAppPackageArgs";
import { ConfigureTeamsAppArgs } from "./interfaces/ConfigureTeamsAppArgs";
import { DriverContext } from "../interface/commonArgs";
import { envUtil } from "../../utils/envUtil";
import { AppPackage } from "./interfaces/appdefinitions/appPackage";
import { basename, extname } from "path";
import set from "lodash/set";
import { actionName as createAppPackageActionName } from "./createAppPackage";
import { actionName as configureTeamsAppActionName } from "./configure";
import { FileNotFoundError, UserCancelError } from "../../../error/common";
import { TelemetryUtils } from "./utils/telemetry";
import { QuestionNames } from "../../../question";

export async function checkIfAppInDifferentAcountSameTenant(
  teamsAppId: string,
  tokenProvider: M365TokenProvider,
  logger: LogProvider
): Promise<Result<boolean, FxError>> {
  const appStudioTokenRes = await tokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }

  const appStudioToken = appStudioTokenRes.value;

  try {
    await AppStudioClient.getApp(teamsAppId, appStudioToken, logger);
  } catch (error: any) {
    if (error.message && error.message.includes("404")) {
      const exists = await AppStudioClient.checkExistsInTenant(teamsAppId, appStudioToken, logger);

      return ok(exists);
    }
  }

  return ok(false);
}

export async function updateManifestV3(
  ctx: Context,
  inputs: InputsWithProjectPath
): Promise<Result<Map<string, string>, FxError>> {
  TelemetryUtils.init(ctx);
  const state = {
    ENV_NAME: process.env.TEAMSFX_ENV,
  };
  const manifestTemplatePath =
    inputs.manifestTemplatePath ?? manifestUtils.getTeamsAppManifestPath(inputs.projectPath);
  const manifestFileName = path.join(
    inputs.projectPath,
    AppPackageFolderName,
    BuildFolderName,
    `manifest.${state.ENV_NAME!}.json`
  );

  // Prepare for driver
  const buildDriver: CreateAppPackageDriver = Container.get(createAppPackageActionName);
  const createAppPackageArgs = generateCreateAppPackageArgs(
    inputs.projectPath,
    manifestTemplatePath,
    state.ENV_NAME!
  );
  const updateTeamsAppArgs: ConfigureTeamsAppArgs = {
    appPackagePath: createAppPackageArgs.outputZipPath,
  };
  const driverContext: DriverContext = generateDriverContext(ctx, inputs);
  await envUtil.readEnv(inputs.projectPath, state.ENV_NAME!);

  // render manifest
  let manifest: any;
  const manifestResult = await manifestUtils.getManifestV3(manifestTemplatePath);
  if (manifestResult.isErr()) {
    return err(manifestResult.error);
  } else {
    manifest = manifestResult.value;
  }

  // read built manifest file
  if (
    !(await fs.pathExists(manifestFileName)) ||
    !(await fs.pathExists(createAppPackageArgs.outputZipPath))
  ) {
    const res = (await buildDriver.execute(createAppPackageArgs, driverContext)).result;
    if (res.isErr()) {
      return err(res.error);
    }
  }
  const existingManifest = await fs.readJSON(manifestFileName);
  const teamsAppId = manifest.id;
  delete manifest.id;
  delete existingManifest.id;
  if (!_.isEqual(manifest, existingManifest)) {
    const previewOnly = getLocalizedString("plugins.appstudio.previewOnly");
    const previewUpdate = getLocalizedString("plugins.appstudio.previewAndUpdate");
    const res = await ctx.userInteraction.showMessage(
      "warn",
      getLocalizedString("plugins.appstudio.updateManifestTip"),
      true,
      previewUpdate,
      previewOnly
    );

    if (res?.isOk() && res.value === previewOnly) {
      return (await buildDriver.execute(createAppPackageArgs, driverContext)).result;
    } else if (res?.isOk() && res.value === previewUpdate) {
      await buildDriver.execute(createAppPackageArgs, driverContext);
    } else {
      return err(new UserCancelError("appStudio"));
    }
  }

  const appStudioTokenRes = await ctx.tokenProvider!.m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  const appStudioToken = appStudioTokenRes.value;

  try {
    const localUpdateTime = process.env.TEAMS_APP_UPDATE_TIME;
    if (localUpdateTime) {
      const app = await AppStudioClient.getApp(teamsAppId, appStudioToken, ctx.logProvider);
      const devPortalUpdateTime = new Date(app.updatedAt!)?.getTime() ?? -1;
      if (new Date(localUpdateTime).getTime() < devPortalUpdateTime) {
        const option = getLocalizedString("plugins.appstudio.overwriteAndUpdate");
        const res = await ctx.userInteraction.showMessage(
          "warn",
          getLocalizedString("plugins.appstudio.updateOverwriteTip"),
          true,
          option
        );
        if (!(res?.isOk() && res.value === option)) {
          return err(new UserCancelError("appStudio"));
        }
      }
    }

    const configureDriver: ConfigureTeamsAppDriver = Container.get(configureTeamsAppActionName);
    const result = (await configureDriver.execute(updateTeamsAppArgs, driverContext)).result;
    if (result.isErr()) {
      return err(result.error);
    }

    let loginHint = "";
    const accountRes = await ctx.tokenProvider!.m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    if (accountRes.isOk()) {
      loginHint = accountRes.value.unique_name as string;
    }

    const url = util.format(Constants.DEVELOPER_PORTAL_APP_PACKAGE_URL, teamsAppId, loginHint);
    if (inputs.platform === Platform.CLI) {
      const message = [
        {
          content: getLocalizedString("plugins.appstudio.teamsAppUpdatedCLINotice"),
          color: Colors.BRIGHT_GREEN,
        },
        { content: url, color: Colors.BRIGHT_CYAN },
      ];
      await ctx.userInteraction.showMessage("info", message, false);
    } else {
      void ctx.userInteraction
        .showMessage(
          "info",
          getLocalizedString("plugins.appstudio.teamsAppUpdatedNotice"),
          false,
          getLocalizedString("plugins.appstudio.viewDeveloperPortal")
        )
        .then(async (res) => {
          if (
            res?.isOk() &&
            res.value === getLocalizedString("plugins.appstudio.viewDeveloperPortal")
          ) {
            await ctx.userInteraction.openUrl(url);
          }
        });
    }
    return result;
  } catch (error: any) {
    if (error.message && error.message.includes("404")) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.UpdateManifestWithInvalidAppError.name,
          AppStudioError.UpdateManifestWithInvalidAppError.message(teamsAppId)
        )
      );
    } else {
      return err(error);
    }
  }
}

export async function updateTeamsAppV3ForPublish(
  ctx: Context,
  inputs: InputsWithProjectPath
): Promise<Result<any, FxError>> {
  let teamsAppId;
  const driverContext: DriverContext = generateDriverContext(ctx, inputs);

  const updateTeamsAppArgs: ConfigureTeamsAppArgs = {
    appPackagePath: inputs[QuestionNames.AppPackagePath],
  };

  const zipEntries = new AdmZip(updateTeamsAppArgs.appPackagePath).getEntries();
  const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
  let validationError: UserError | undefined;
  if (manifestFile) {
    try {
      const manifestString = manifestFile.getData().toString();
      const manifest = JSON.parse(manifestString) as TeamsAppManifest;
      if (!manifest.id || !isUUID(manifest.id)) {
        validationError = AppStudioResultFactory.UserError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message([
            getLocalizedString("error.appstudio.noManifestId"),
          ])
        );
      } else {
        teamsAppId = manifest.id;
        const validationResult = await ManifestUtil.validateManifest(manifest);
        if (validationResult.length > 0) {
          const errMessage = AppStudioError.ValidationFailedError.message(validationResult);
          validationError = AppStudioResultFactory.UserError(
            AppStudioError.ValidationFailedError.name,
            errMessage
          );
        }
      }
    } catch (e) {
      validationError = AppStudioResultFactory.UserError(
        AppStudioError.ValidationFailedError.name,
        AppStudioError.ValidationFailedError.message([(e as any).message])
      );
      validationError.stack = (e as any).stack;
    }
  } else {
    // missing manifest file
    validationError = new FileNotFoundError("appManifest", "manifest.json");
  }

  if (validationError) {
    const suggestionDefaultMessage = getDefaultString(
      "error.appstudio.publishInDevPortalSuggestionForValidationError"
    );
    const suggestionMessage = getLocalizedString(
      "error.appstudio.publishInDevPortalSuggestionForValidationError"
    );
    validationError.message += ` ${suggestionDefaultMessage}`;
    validationError.displayMessage += ` ${suggestionMessage}`;
    ctx.logProvider?.error(getLocalizedString("plugins.appstudio.validationFailedNotice"));
    return err(validationError);
  }

  const configureDriver: ConfigureTeamsAppDriver = Container.get(configureTeamsAppActionName);
  const result = (await configureDriver.execute(updateTeamsAppArgs, driverContext)).result;
  if (result.isErr()) {
    return err(result.error);
  }

  return ok(teamsAppId);
}

export async function getAppPackage(
  teamsAppId: string,
  m365TokenProvider: M365TokenProvider,
  logProvider?: LogProvider
): Promise<Result<AppPackage, FxError>> {
  const appStudioTokenRes = await m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  try {
    const data = await AppStudioClient.getAppPackage(
      teamsAppId,
      appStudioTokenRes.value,
      logProvider
    );

    const appPackage: AppPackage = {};

    const buffer = Buffer.from(data, "base64");
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries(); // an array of ZipEntry records

    zipEntries?.forEach(function (zipEntry) {
      const data = zipEntry.getData();
      const name = zipEntry.entryName.toLowerCase();
      switch (name) {
        case "manifest.json":
          appPackage.manifest = data;
          break;
        case "color.png":
          appPackage.icons = { ...appPackage.icons, color: data };
          break;
        case "outline.png":
          appPackage.icons = { ...appPackage.icons, outline: data };
          break;
        default:
          const ext = extname(name);
          const base = basename(name, ext);
          // Since we don't support scene features, the remaining files are json files for language.
          if (supportedLanguageCodes.findIndex((code) => code === base) > -1) {
            set(appPackage, ["languages", base], data);
          } else {
            logProvider?.warning(getLocalizedString("plugins.appstudio.unprocessedFile", name));
          }
      }
    });
    return ok(appPackage);
  } catch (e: any) {
    return err(e);
  }
}

function generateDriverContext(ctx: Context, inputs: InputsWithProjectPath): DriverContext {
  return {
    azureAccountProvider: ctx.tokenProvider!.azureAccountProvider,
    m365TokenProvider: ctx.tokenProvider!.m365TokenProvider,
    ui: ctx.userInteraction,
    progressBar: undefined,
    logProvider: ctx.logProvider,
    telemetryReporter: ctx.telemetryReporter,
    projectPath: ctx.projectPath!,
    platform: inputs.platform,
  };
}

function generateCreateAppPackageArgs(
  projectPath: string,
  manifestTemplatePath: string,
  envName: string
): CreateAppPackageArgs {
  const manifestFileName = path.join(
    projectPath,
    AppPackageFolderName,
    BuildFolderName,
    `manifest.${envName}.json`
  );

  return {
    manifestPath: manifestTemplatePath,
    outputZipPath: path.join(
      projectPath,
      AppPackageFolderName,
      BuildFolderName,
      `appPackage.${envName}.zip`
    ),
    outputJsonPath: manifestFileName,
  };
}
