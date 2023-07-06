// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import {
  AppPackageFolderName,
  BuildFolderName,
  Func,
  FxError,
  Inputs,
  InputsWithProjectPath,
  Platform,
  Result,
  Stage,
  Tools,
  Void,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { DotenvParseOutput } from "dotenv";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { Container } from "typedi";
import { pathToFileURL } from "url";
import { VSCodeExtensionCommand } from "../common/constants";
import { getLocalizedString } from "../common/localizeUtils";
import { Hub } from "../common/m365/constants";
import { LaunchHelper } from "../common/m365/launchHelper";
import { isValidProjectV2, isValidProjectV3 } from "../common/projectSettingsHelper";
import { VersionSource, VersionState } from "../common/versionMetadata";
import {
  AadConstants,
  SPFxQuestionNames,
  SingleSignOnOptionItem,
  ViewAadAppHelpLinkV5,
} from "../component/constants";
import { coordinator } from "../component/coordinator";
import { UpdateAadAppArgs } from "../component/driver/aad/interface/updateAadAppArgs";
import { UpdateAadAppDriver } from "../component/driver/aad/update";
import { buildAadManifest } from "../component/driver/aad/utility/buildAadManifest";
import { AddWebPartDriver } from "../component/driver/add/addWebPart";
import { AddWebPartArgs } from "../component/driver/add/interface/AddWebPartArgs";
import "../component/driver/index";
import { DriverContext } from "../component/driver/interface/commonArgs";
import { updateManifestV3 } from "../component/driver/teamsApp/appStudio";
import { CreateAppPackageDriver } from "../component/driver/teamsApp/createAppPackage";
import { CreateAppPackageArgs } from "../component/driver/teamsApp/interfaces/CreateAppPackageArgs";
import { ValidateAppPackageArgs } from "../component/driver/teamsApp/interfaces/ValidateAppPackageArgs";
import { ValidateManifestArgs } from "../component/driver/teamsApp/interfaces/ValidateManifestArgs";
import { manifestUtils } from "../component/driver/teamsApp/utils/ManifestUtils";
import {
  containsUnsupportedFeature,
  getFeaturesFromAppDefinition,
} from "../component/driver/teamsApp/utils/utils";
import { ValidateManifestDriver } from "../component/driver/teamsApp/validate";
import { ValidateAppPackageDriver } from "../component/driver/teamsApp/validateAppPackage";
import { EnvLoaderMW, EnvWriterMW } from "../component/middleware/envMW";
import { QuestionMW } from "../component/middleware/questionMW";
import { createContextV3, createDriverContext } from "../component/utils";
import { envUtil } from "../component/utils/envUtil";
import { pathUtils } from "../component/utils/pathUtils";
import { FileNotFoundError, InvalidProjectError } from "../error/common";
import { NoNeedUpgradeError } from "../error/upgrade";
import { YamlFieldMissingError } from "../error/yml";
import { questions } from "../question";
import { SPFxVersionOptionIds } from "../question/create";
import { isAadMainifestContainsPlaceholder } from "../question/other";
import { QuestionNames } from "../question/questionNames";
import { checkPermission, grantPermission, listCollaborator } from "./collaborator";
import { InvalidInputError } from "./error";
import { TOOLS } from "./globalVars";
import { ConcurrentLockerMW } from "./middleware/concurrentLocker";
import { ContextInjectorMW } from "./middleware/contextInjector";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { ProjectMigratorMWV3, checkActiveResourcePlugins } from "./middleware/projectMigratorV3";
import {
  getProjectVersionFromPath,
  getTrackingIdFromPath,
  getVersionState,
} from "./middleware/utils/v3MigrationUtils";
import { CoreTelemetryEvent, CoreTelemetryProperty } from "./telemetry";
import { CoreHookContext, PreProvisionResForVS, VersionCheckRes } from "./types";

export class FxCoreV3Implement {
  tools: Tools;
  isFromSample?: boolean;
  settingsVersion?: string;

  constructor(tools: Tools) {
    this.tools = tools;
  }

  async dispatch<Inputs, ExecuteRes>(
    exec: (inputs: Inputs) => Promise<ExecuteRes>,
    inputs: Inputs
  ): Promise<ExecuteRes> {
    const methodName = exec.name as keyof FxCoreV3Implement;
    if (!this[methodName]) {
      throw new Error("no implement");
    }
    const method = this[methodName] as any as typeof exec;
    return await method.call(this, inputs);
  }

  async dispatchUserTask<Inputs, ExecuteRes>(
    exec: (func: Func, inputs: Inputs) => Promise<ExecuteRes>,
    func: Func,
    inputs: Inputs
  ): Promise<ExecuteRes> {
    const methodName = exec.name as keyof FxCoreV3Implement;
    if (!this[methodName]) {
      throw new Error("no implement");
    }
    const method = this[methodName] as any as typeof exec;
    return await method.call(this, func, inputs);
  }

  @hooks([ErrorHandlerMW, QuestionMW(questions.createProject)])
  async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
    const context = createContextV3();
    if (inputs.teamsAppFromTdp) {
      // should never happen as we do same check on Developer Portal.
      if (containsUnsupportedFeature(inputs.teamsAppFromTdp)) {
        return err(InvalidInputError("Teams app contains unsupported features"));
      } else {
        context.telemetryReporter.sendTelemetryEvent(CoreTelemetryEvent.CreateFromTdpStart, {
          [CoreTelemetryProperty.TdpTeamsAppFeatures]: getFeaturesFromAppDefinition(
            inputs.teamsAppFromTdp
          ).join(","),
          [CoreTelemetryProperty.TdpTeamsAppId]: inputs.teamsAppFromTdp.teamsAppId,
        });
      }
    }
    const res = await coordinator.create(context, inputs as InputsWithProjectPath);
    if (res.isErr()) return err(res.error);
    inputs.projectPath = context.projectPath;
    return ok(inputs.projectPath!);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    EnvLoaderMW(false),
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async provisionResources(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    inputs.stage = Stage.provision;
    const context = createDriverContext(inputs);
    try {
      const res = await coordinator.provision(context, inputs as InputsWithProjectPath);
      if (res.isOk()) {
        ctx!.envVars = res.value;
        return ok(Void);
      } else {
        // for partial success scenario, output is set in inputs object
        ctx!.envVars = inputs.envVars;
        return err(res.error);
      }
    } finally {
      //reset subscription
      try {
        await TOOLS.tokenProvider.azureAccountProvider.setSubscription("");
      } catch (e) {}
    }
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    EnvLoaderMW(false),
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async deployArtifacts(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    inputs.stage = Stage.deploy;
    const context = createDriverContext(inputs);
    const res = await coordinator.deploy(context, inputs as InputsWithProjectPath);
    if (res.isOk()) {
      ctx!.envVars = res.value;
      return ok(Void);
    } else {
      // for partial success scenario, output is set in inputs object
      ctx!.envVars = inputs.envVars;
      return err(res.error);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionMW(questions.deployAadManifest),
    EnvLoaderMW(true, true),
    ConcurrentLockerMW,
    ContextInjectorMW,
  ])
  async deployAadManifest(inputs: Inputs): Promise<Result<Void, FxError>> {
    inputs.stage = Stage.deployAad;
    const updateAadClient = Container.get<UpdateAadAppDriver>("aadApp/update");
    // In V3, the aad.template.json exist at .fx folder, and output to root build folder.
    const manifestTemplatePath: string = inputs[QuestionNames.AadAppManifestFilePath];
    if (!(await fs.pathExists(manifestTemplatePath))) {
      return err(new FileNotFoundError("deployAadManifest", manifestTemplatePath));
    }
    let manifestOutputPath: string = manifestTemplatePath;
    if (inputs.env && (await isAadMainifestContainsPlaceholder(inputs))) {
      await fs.ensureDir(path.join(inputs.projectPath!, "build"));
      manifestOutputPath = path.join(
        inputs.projectPath!,
        "build",
        `aad.manifest.${inputs.env}.json`
      );
    }
    const inputArgs: UpdateAadAppArgs = {
      manifestPath: manifestTemplatePath,
      outputFilePath: manifestOutputPath,
    };
    const Context: DriverContext = createDriverContext(inputs);
    const res = await updateAadClient.run(inputArgs, Context);
    if (res.isErr()) {
      return err(res.error);
    }
    if (Context.platform === Platform.CLI) {
      const msg = getLocalizedString("core.deploy.aadManifestOnCLISuccessNotice");
      Context.ui!.showMessage("info", msg, false);
    } else {
      const msg = getLocalizedString("core.deploy.aadManifestSuccessNotice");
      Context.ui!.showMessage(
        "info",
        msg,
        false,
        getLocalizedString("core.deploy.aadManifestLearnMore")
      ).then((result) => {
        const userSelected = result.isOk() ? result.value : undefined;
        if (userSelected === getLocalizedString("core.deploy.aadManifestLearnMore")) {
          Context.ui!.openUrl(ViewAadAppHelpLinkV5);
        }
      });
    }
    return ok(Void);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    EnvLoaderMW(false),
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async publishApplication(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    inputs.stage = Stage.publish;
    const context = createDriverContext(inputs);
    const res = await coordinator.publish(context, inputs as InputsWithProjectPath);
    if (res.isOk()) {
      ctx!.envVars = res.value;
      return ok(Void);
    } else {
      // for partial success scenario, output is set in inputs object
      ctx!.envVars = inputs.envVars;
      return err(res.error);
    }
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionMW(questions.selectTeamsAppManifest),
    EnvLoaderMW(true),
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async deployTeamsManifest(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    inputs.manifestTemplatePath = inputs[QuestionNames.TeamsAppManifestFilePath] as string;
    const context = createContextV3();
    const res = await updateManifestV3(context, inputs as InputsWithProjectPath);
    if (res.isOk()) {
      ctx!.envVars = envUtil.map2object(res.value);
    }
    return res;
  }

  @hooks([ErrorHandlerMW, ProjectMigratorMWV3, EnvLoaderMW(false), ConcurrentLockerMW])
  async executeUserTask(func: Func, inputs: Inputs): Promise<Result<any, FxError>> {
    let res: Result<any, FxError> = ok(undefined);
    const context = createDriverContext(inputs);
    if (func.method === "addSso") {
      // used in v3 only in VS
      inputs.stage = Stage.addFeature;
      inputs[QuestionNames.Features] = SingleSignOnOptionItem.id;
      const component = Container.get("sso") as any;
      res = await component.add(context, inputs as InputsWithProjectPath);
    }
    return res;
  }

  @hooks([
    ErrorHandlerMW,
    QuestionMW(questions.addWebpart),
    ProjectMigratorMWV3,
    ConcurrentLockerMW,
  ])
  async addWebpart(inputs: Inputs): Promise<Result<Void, FxError>> {
    const driver: AddWebPartDriver = Container.get<AddWebPartDriver>("spfx/add");
    const args: AddWebPartArgs = {
      manifestPath: inputs[SPFxQuestionNames.ManifestPath],
      localManifestPath: inputs[SPFxQuestionNames.LocalManifestPath],
      spfxFolder: inputs[SPFxQuestionNames.SPFxFolder],
      webpartName: inputs[SPFxQuestionNames.WebPartName],
      spfxPackage: SPFxVersionOptionIds.installLocally,
    };
    const Context: DriverContext = createDriverContext(inputs);
    return await driver.run(args, Context);
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextInjectorMW])
  async publishInDeveloperPortal(inputs: Inputs): Promise<Result<Void, FxError>> {
    inputs.stage = Stage.publishInDeveloperPortal;
    const context = createContextV3();
    return await coordinator.publishInDeveloperPortal(context, inputs as InputsWithProjectPath);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionMW(questions.grantPermission),
    EnvLoaderMW(false, true),
    ConcurrentLockerMW,
    EnvWriterMW,
  ])
  async grantPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    inputs.stage = Stage.grantPermission;
    const context = createContextV3();
    const res = await grantPermission(
      context,
      inputs as InputsWithProjectPath,
      TOOLS.tokenProvider
    );
    return res;
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    EnvLoaderMW(false, true),
    ConcurrentLockerMW,
    EnvWriterMW,
  ])
  async checkPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    inputs.stage = Stage.checkPermission;
    const context = createContextV3();
    const res = await checkPermission(
      context,
      inputs as InputsWithProjectPath,
      TOOLS.tokenProvider
    );
    return res;
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionMW(questions.listCollaborator),
    EnvLoaderMW(false, true),
    ConcurrentLockerMW,
    EnvWriterMW,
  ])
  async listCollaborator(inputs: Inputs): Promise<Result<any, FxError>> {
    inputs.stage = Stage.listCollaborator;
    const context = createContextV3();
    const res = await listCollaborator(
      context,
      inputs as InputsWithProjectPath,
      TOOLS.tokenProvider
    );
    return res;
  }

  /**
   * get all dot envs
   */
  @hooks([ErrorHandlerMW])
  async getDotEnvs(
    inputs: InputsWithProjectPath
  ): Promise<Result<{ [name: string]: DotenvParseOutput }, FxError>> {
    const envListRes = await envUtil.listEnv(inputs.projectPath);
    if (envListRes.isErr()) {
      return err(envListRes.error);
    }
    const res: { [name: string]: DotenvParseOutput } = {};
    for (const env of envListRes.value) {
      const envRes = await envUtil.readEnv(inputs.projectPath, env, false, false);
      if (envRes.isErr()) {
        return err(envRes.error);
      }
      res[env] = envRes.value as DotenvParseOutput;
    }
    return ok(res);
  }

  async phantomMigrationV3(inputs: Inputs): Promise<Result<Void, FxError>> {
    // If the project is invalid or upgraded, the ProjectMigratorMWV3 will not take action.
    // Check invaliad/upgraded project here before call ProjectMigratorMWV3
    const projectPath = (inputs.projectPath as string) || "";
    const version = await getProjectVersionFromPath(projectPath);

    if (version.source === VersionSource.teamsapp) {
      return err(new NoNeedUpgradeError());
    } else if (version.source === VersionSource.projectSettings) {
      const isValid = await checkActiveResourcePlugins(projectPath);
      if (!isValid) {
        return err(new InvalidProjectError());
      }
    }
    if (version.source === VersionSource.unknown) {
      return err(new InvalidProjectError());
    }
    return await this.innerMigrationV3(inputs);
  }

  @hooks([ErrorHandlerMW, ProjectMigratorMWV3])
  async innerMigrationV3(inputs: Inputs): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  @hooks([ErrorHandlerMW])
  async projectVersionCheck(inputs: Inputs): Promise<Result<VersionCheckRes, FxError>> {
    const projectPath = (inputs.projectPath as string) || "";
    if (isValidProjectV3(projectPath) || isValidProjectV2(projectPath)) {
      const versionInfo = await getProjectVersionFromPath(projectPath);
      if (!versionInfo.version) {
        return err(new InvalidProjectError());
      }
      const trackingId = await getTrackingIdFromPath(projectPath);
      const isSupport = getVersionState(versionInfo);
      // if the project is upgradeable, check whether the project is valid and invalid project should not show upgrade option.
      if (isSupport === VersionState.upgradeable) {
        if (!(await checkActiveResourcePlugins(projectPath))) {
          return err(new InvalidProjectError());
        }
      }
      return ok({
        currentVersion: versionInfo.version,
        trackingId,
        isSupport,
        versionSource: VersionSource[versionInfo.source],
      });
    } else {
      return err(new InvalidProjectError());
    }
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    EnvLoaderMW(false),
    ConcurrentLockerMW,
    ContextInjectorMW,
  ])
  async preProvisionForVS(inputs: Inputs): Promise<Result<PreProvisionResForVS, FxError>> {
    const context = createDriverContext(inputs);
    return coordinator.preProvisionForVS(context, inputs as InputsWithProjectPath);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    EnvLoaderMW(false),
    ConcurrentLockerMW,
    ContextInjectorMW,
  ])
  async preCheckYmlAndEnvForVS(inputs: Inputs): Promise<Result<Void, FxError>> {
    const context = createDriverContext(inputs);
    const result = await coordinator.preCheckYmlAndEnvForVS(
      context,
      inputs as InputsWithProjectPath
    );
    return result;
  }

  @hooks([ErrorHandlerMW, QuestionMW(questions.createNewEnv), ConcurrentLockerMW])
  async createEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    return this.createEnvCopyV3(
      inputs[QuestionNames.NewTargetEnvName]!,
      inputs[QuestionNames.SourceEnvName]!,
      inputs.projectPath!
    );
  }

  async createEnvCopyV3(
    targetEnvName: string,
    sourceEnvName: string,
    projectPath: string
  ): Promise<Result<Void, FxError>> {
    let res = await pathUtils.getEnvFilePath(projectPath, sourceEnvName);
    if (res.isErr()) return err(res.error);
    const sourceDotEnvFile = res.value;

    res = await pathUtils.getEnvFilePath(projectPath, targetEnvName);
    if (res.isErr()) return err(res.error);
    const targetDotEnvFile = res.value;
    if (!sourceDotEnvFile || !targetDotEnvFile)
      return err(new YamlFieldMissingError("environmentFolderPath"));
    if (!(await fs.pathExists(sourceDotEnvFile)))
      return err(new FileNotFoundError("createEnvCopyV3", sourceDotEnvFile));
    const source = await fs.readFile(sourceDotEnvFile);
    const writeStream = fs.createWriteStream(targetDotEnvFile);
    source
      .toString()
      .split(/\r?\n/)
      .forEach((line) => {
        const reg = /^([a-zA-Z_][a-zA-Z0-9_]*=)/g;
        const match = reg.exec(line);
        if (match) {
          if (match[1].startsWith("TEAMSFX_ENV=")) {
            writeStream.write(`TEAMSFX_ENV=${targetEnvName}${os.EOL}`);
          } else {
            writeStream.write(`${match[1]}${os.EOL}`);
          }
        } else {
          writeStream.write(`${line.trim()}${os.EOL}`);
        }
      });

    writeStream.end();
    return ok(Void);
  }

  @hooks([ErrorHandlerMW, ProjectMigratorMWV3, EnvLoaderMW(false), ConcurrentLockerMW])
  async buildAadManifest(inputs: Inputs): Promise<Result<Void, FxError>> {
    const manifestTemplatePath: string = inputs.AAD_MANIFEST_FILE
      ? inputs.AAD_MANIFEST_FILE
      : path.join(inputs.projectPath!, AadConstants.DefaultTemplateFileName);
    if (!(await fs.pathExists(manifestTemplatePath))) {
      return err(new FileNotFoundError("buildAadManifest", manifestTemplatePath));
    }
    await fs.ensureDir(path.join(inputs.projectPath!, "build"));
    const manifestOutputPath: string = path.join(
      inputs.projectPath!,
      "build",
      `aad.${inputs.env}.json`
    );
    const Context: DriverContext = createDriverContext(inputs);
    await buildAadManifest(Context, manifestTemplatePath, manifestOutputPath);
    return ok(Void);
  }

  @hooks([
    ErrorHandlerMW,
    QuestionMW(questions.selectTeamsAppManifest),
    ConcurrentLockerMW,
    EnvLoaderMW(true),
  ])
  async validateManifest(inputs: Inputs): Promise<Result<any, FxError>> {
    inputs.stage = Stage.validateApplication;

    const context: DriverContext = createDriverContext(inputs);

    const teamsAppManifestFilePath = inputs?.[QuestionNames.TeamsAppManifestFilePath] as string;
    const args: ValidateManifestArgs = {
      manifestPath: teamsAppManifestFilePath,
      showMessage: inputs?.showMessage != undefined ? inputs.showMessage : true,
    };
    const driver: ValidateManifestDriver = Container.get("teamsApp/validateManifest");
    const result = await driver.run(args, context);
    return result;
  }

  @hooks([ErrorHandlerMW, QuestionMW(questions.selectTeamsAppPackage), ConcurrentLockerMW])
  async validateAppPackage(inputs: Inputs): Promise<Result<any, FxError>> {
    inputs.stage = Stage.validateApplication;

    const context: DriverContext = createDriverContext(inputs);
    const teamsAppPackageFilePath = inputs?.[QuestionNames.TeamsAppPackageFilePath] as string;
    const args: ValidateAppPackageArgs = {
      appPackagePath: teamsAppPackageFilePath,
      showMessage: true,
    };
    const driver: ValidateAppPackageDriver = Container.get("teamsApp/validateAppPackage");
    return await driver.run(args, context);
  }

  @hooks([
    ErrorHandlerMW,
    QuestionMW(questions.selectTeamsAppManifest),
    EnvLoaderMW(true),
    ConcurrentLockerMW,
  ])
  async createAppPackage(inputs: Inputs): Promise<Result<any, FxError>> {
    inputs.stage = Stage.createAppPackage;

    const context: DriverContext = createDriverContext(inputs);

    const teamsAppManifestFilePath = inputs?.[QuestionNames.TeamsAppManifestFilePath] as string;

    const driver: CreateAppPackageDriver = Container.get("teamsApp/zipAppPackage");
    const args: CreateAppPackageArgs = {
      manifestPath: teamsAppManifestFilePath,
      outputZipPath:
        inputs[QuestionNames.OutputZipPathParamName] ??
        `${inputs.projectPath}/${AppPackageFolderName}/${BuildFolderName}/appPackage.${process.env.TEAMSFX_ENV}.zip`,
      outputJsonPath:
        inputs[QuestionNames.OutputManifestParamName] ??
        `${inputs.projectPath}/${AppPackageFolderName}/${BuildFolderName}/manifest.${process.env.TEAMSFX_ENV}.json`,
    };
    const result = await driver.run(args, context);
    if (context.platform === Platform.VSCode) {
      if (result.isOk()) {
        const isWindows = process.platform === "win32";
        let zipFileName = args.outputZipPath;
        if (!path.isAbsolute(zipFileName)) {
          zipFileName = path.join(context.projectPath, zipFileName);
        }
        let builtSuccess = getLocalizedString(
          "plugins.appstudio.buildSucceedNotice.fallback",
          zipFileName
        );
        if (isWindows) {
          const folderLink = pathToFileURL(path.dirname(zipFileName));
          const appPackageLink = `${VSCodeExtensionCommand.openFolder}?%5B%22${folderLink}%22%5D`;
          builtSuccess = getLocalizedString("plugins.appstudio.buildSucceedNotice", appPackageLink);
        }
        context.ui?.showMessage("info", builtSuccess, false);
      }
    }
    return result;
  }

  @hooks([
    ErrorHandlerMW,
    QuestionMW(questions.previewWithTeamsAppManifest),
    EnvLoaderMW(false),
    ConcurrentLockerMW,
  ])
  async previewWithManifest(inputs: Inputs): Promise<Result<string, FxError>> {
    inputs.stage = Stage.previewWithManifest;

    const hub = inputs[QuestionNames.M365Host] as Hub;
    const manifestFilePath = inputs[QuestionNames.TeamsAppManifestFilePath] as string;

    const manifestRes = await manifestUtils.getManifestV3(manifestFilePath, false);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }

    const teamsAppId = manifestRes.value.id;
    const capabilities = manifestUtils.getCapabilities(manifestRes.value);

    const launchHelper = new LaunchHelper(
      this.tools.tokenProvider.m365TokenProvider,
      this.tools.logProvider
    );
    const result = await launchHelper.getLaunchUrl(hub, teamsAppId, capabilities);
    return result;
  }
}
