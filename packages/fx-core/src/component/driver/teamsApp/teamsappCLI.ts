// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Colors,
  FxError,
  Result,
  TeamsAppInputs,
  TeamsAppManifest,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import * as path from "path";
import { Container } from "typedi";
import * as util from "util";
import { getLocalizedString } from "../../../common/localizeUtils";
import { AppStudioScopes } from "../../../common/tools";
import { FileNotFoundError, MissingRequiredInputError } from "../../../error/common";
import { createDriverContext } from "../../utils";
import { envUtil } from "../../utils/envUtil";
import { DriverContext } from "../interface/commonArgs";
import { ConfigureTeamsAppDriver, actionName as configureTeamsAppActionName } from "./configure";
import { Constants } from "./constants";
import {
  CreateAppPackageDriver,
  actionName as createAppPackageActionName,
} from "./createAppPackage";
import { ConfigureTeamsAppArgs } from "./interfaces/ConfigureTeamsAppArgs";
import { CreateAppPackageArgs } from "./interfaces/CreateAppPackageArgs";
import { PublishAppPackageArgs } from "./interfaces/PublishAppPackageArgs";
import { ValidateAppPackageArgs } from "./interfaces/ValidateAppPackageArgs";
import { ValidateManifestArgs } from "./interfaces/ValidateManifestArgs";
import {
  actionName as PublishAppPackageActionName,
  PublishAppPackageDriver,
} from "./publishAppPackage";
import { manifestUtils } from "./utils/ManifestUtils";
import { ValidateManifestDriver } from "./validate";
import { ValidateAppPackageDriver } from "./validateAppPackage";

export async function ensureAppPackageFile(
  inputs: TeamsAppInputs
): Promise<Result<undefined, FxError>> {
  // if no package file input, then do package first
  if (!inputs["package-file"]) {
    const packageRes = await packageTeamsApp(inputs);
    if (packageRes.isErr()) {
      return err(packageRes.error);
    }
    inputs["package-file"] = packageRes.value.outputZipPath;
  }
  if (!(await fs.pathExists(inputs["package-file"]))) {
    return err(new FileNotFoundError("updateTeamsApp", inputs["package-file"]));
  }
  return ok(undefined);
}

export async function readManifestFromAppPackage(
  appPackagePath: string
): Promise<Result<TeamsAppManifest, FxError>> {
  const archivedFile = await fs.readFile(appPackagePath);
  const zipEntries = new AdmZip(archivedFile).getEntries();
  const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
  if (manifestFile) {
    const manifestContent = manifestFile.getData().toString();
    const manifest = JSON.parse(manifestContent) as TeamsAppManifest;
    return ok(manifest);
  }
  return err(
    new FileNotFoundError(
      "readManifestFromAppPackage",
      appPackagePath + ":" + Constants.MANIFEST_FILE
    )
  );
}

export async function packageTeamsApp(
  inputs: TeamsAppInputs
): Promise<Result<CreateAppPackageArgs, FxError>> {
  if (!inputs["manifest-file"]) {
    const defaultManifestPath = manifestUtils.getTeamsAppManifestPath(inputs.projectPath);
    if (!(await fs.pathExists(defaultManifestPath))) {
      return err(new MissingRequiredInputError("package-file/manifest-file", "updateTeamsApp"));
    }
    inputs["manifest-file"] = defaultManifestPath;
  } else {
    if (!(await fs.pathExists(inputs["manifest-file"]))) {
      return err(new FileNotFoundError("updateTeamsApp", inputs["manifest-file"]));
    }
  }
  // reach here means manifes-file is provided and exists
  inputs["output-package-file"] =
    inputs["output-package-file"] ||
    path.join(inputs.projectPath, "appPackage", "build", "appPackage.zip");
  inputs["output-manifest-file"] =
    inputs["output-manifest-file"] ||
    path.join(inputs.projectPath, "appPackage", "build", "manifest.json");

  if (inputs["env-file"]) {
    await envUtil.loadEnvFile(inputs["env-file"]);
  }

  const packageArgs: CreateAppPackageArgs = {
    manifestPath: inputs["manifest-file"],
    outputZipPath: inputs["output-package-file"],
    outputJsonPath: inputs["output-manifest-file"],
  };
  const buildDriver: CreateAppPackageDriver = Container.get(createAppPackageActionName);
  const driverContext: DriverContext = createDriverContext(inputs);

  const res = (await buildDriver.execute(packageArgs, driverContext)).result;
  if (res.isErr()) {
    return err(res.error);
  }
  return ok(packageArgs);
}

/**
 * entry of validate teams app
 */
export async function validateTeamsApp(
  inputs: TeamsAppInputs
): Promise<Result<undefined, FxError>> {
  const context: DriverContext = createDriverContext(inputs);
  if (inputs["manifest-file"]) {
    if (inputs["env-file"]) {
      await envUtil.loadEnvFile(inputs["env-file"]);
    }
    const teamsAppManifestFilePath = inputs["manifest-file"];
    const args: ValidateManifestArgs = {
      manifestPath: teamsAppManifestFilePath,
      showMessage: inputs?.showMessage != undefined ? inputs.showMessage : true,
    };
    const driver: ValidateManifestDriver = Container.get("teamsApp/validateManifest");
    const result = (await driver.execute(args, context)).result;
    if (result.isErr()) {
      return err(result.error);
    }
  } else if (inputs["package-file"]) {
    const teamsAppPackageFilePath = inputs["package-file"];
    const args: ValidateAppPackageArgs = {
      appPackagePath: teamsAppPackageFilePath,
      showMessage: true,
    };
    const driver: ValidateAppPackageDriver = Container.get("teamsApp/validateAppPackage");
    const result = (await driver.execute(args, context)).result;
    if (result.isErr()) {
      return err(result.error);
    }
  }
  return ok(undefined);
}

/**
 * entry of update teams app
 */
export async function updateTeamsApp(inputs: TeamsAppInputs): Promise<Result<undefined, FxError>> {
  // 1. zip package if necessary
  const packageRes = await ensureAppPackageFile(inputs);
  if (packageRes.isErr()) {
    return err(packageRes.error);
  }

  const appPackageFile = inputs["package-file"] as string;

  const driverContext: DriverContext = createDriverContext(inputs);

  // 2. validate against app package
  const args: ValidateAppPackageArgs = {
    appPackagePath: appPackageFile,
    showMessage: true,
  };
  const driver: ValidateAppPackageDriver = Container.get("teamsApp/validateAppPackage");
  const validateRes = (await driver.execute(args, driverContext)).result;
  if (validateRes.isErr()) {
    return err(validateRes.error);
  }

  // 3. update app package
  const updateTeamsAppArgs: ConfigureTeamsAppArgs = {
    appPackagePath: appPackageFile,
  };

  const configureDriver: ConfigureTeamsAppDriver = Container.get(configureTeamsAppActionName);
  const updateRes = (await configureDriver.execute(updateTeamsAppArgs, driverContext)).result;
  if (updateRes.isErr()) {
    return err(updateRes.error);
  }

  // 4. show result
  let loginHint = "";
  const accountRes = await driverContext.m365TokenProvider.getJsonObject({
    scopes: AppStudioScopes,
  });
  if (accountRes.isOk()) {
    loginHint = accountRes.value.unique_name as string;
  }
  const manifestRes = await readManifestFromAppPackage(appPackageFile);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const manifest = manifestRes.value;
  const teamsAppId = manifest.id;
  const url = util.format(Constants.DEVELOPER_PORTAL_APP_PACKAGE_URL, teamsAppId, loginHint);
  const message = [
    {
      content: getLocalizedString("plugins.appstudio.teamsAppUpdatedCLINotice"),
      color: Colors.BRIGHT_GREEN,
    },
    { content: url, color: Colors.BRIGHT_CYAN },
  ];
  void driverContext.ui?.showMessage("info", message, false);
  return ok(undefined);
}

async function publishTeamsApp(inputs: TeamsAppInputs): Promise<Result<undefined, FxError>> {
  // 1. zip package if necessary
  const packageRes = await ensureAppPackageFile(inputs);
  if (packageRes.isErr()) {
    return err(packageRes.error);
  }

  const appPackageFile = inputs["package-file"] as string;

  const driverContext: DriverContext = createDriverContext(inputs);

  // 2. validate against app package
  const args: ValidateAppPackageArgs = {
    appPackagePath: appPackageFile,
    showMessage: true,
  };
  const driver: ValidateAppPackageDriver = Container.get("teamsApp/validateAppPackage");
  const validateRes = (await driver.execute(args, driverContext)).result;
  if (validateRes.isErr()) {
    return err(validateRes.error);
  }

  // 3. publish app package
  const publishArgs: PublishAppPackageArgs = {
    appPackagePath: appPackageFile,
  };

  const publishDriver: PublishAppPackageDriver = Container.get(PublishAppPackageActionName);
  const updateRes = (await publishDriver.execute(publishArgs, driverContext)).result;
  if (updateRes.isErr()) {
    return err(updateRes.error);
  }
  void driverContext.ui?.showMessage(
    "info",
    `publish successfully, Go to admin portal: ${Constants.TEAMS_ADMIN_PORTAL}`,
    false
  );
  return ok(undefined);
}
