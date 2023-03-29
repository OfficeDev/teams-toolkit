// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import fs from "fs-extra";
import * as path from "path";
import { Container } from "typedi";
import { hooks } from "@feathersjs/hooks";
import {
  err,
  Func,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
  Result,
  Settings,
  Stage,
  Tools,
  UserCancelError,
  Void,
  BuildFolderName,
  AppPackageFolderName,
} from "@microsoft/teamsfx-api";

import {
  AadConstants,
  AzureSolutionQuestionNames,
  SingleSignOnOptionItem,
  SPFxQuestionNames,
} from "../component/constants";
import { ObjectIsUndefinedError, InvalidInputError } from "./error";
import { setCurrentStage, TOOLS } from "./globalVars";
import { ConcurrentLockerMW } from "./middleware/concurrentLocker";
import { ContextInjectorMW } from "./middleware/contextInjector";
import { askNewEnvironment, EnvInfoLoaderMW_V3 } from "./middleware/envInfoLoaderV3";
import { ProjectSettingsLoaderMW } from "./middleware/projectSettingsLoader";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { QuestionModelMW, getQuestionsForCreateProjectV2 } from "./middleware/questionModel";
import { CoreHookContext, PreProvisionResForVS, VersionCheckRes } from "./types";
import { createContextV3, createDriverContext } from "../component/utils";
import { manifestUtils } from "../component/resource/appManifest/utils/ManifestUtils";
import "../component/driver/index";
import { UpdateAadAppDriver } from "../component/driver/aad/update";
import { UpdateAadAppArgs } from "../component/driver/aad/interface/updateAadAppArgs";
import { ValidateManifestDriver } from "../component/driver/teamsApp/validate";
import { ValidateAppPackageDriver } from "../component/driver/teamsApp/validateAppPackage";
import { ValidateManifestArgs } from "../component/driver/teamsApp/interfaces/ValidateManifestArgs";
import { ValidateAppPackageArgs } from "../component/driver/teamsApp/interfaces/ValidateAppPackageArgs";
import { DriverContext } from "../component/driver/interface/commonArgs";
import { coordinator } from "../component/coordinator";
import { CreateAppPackageDriver } from "../component/driver/teamsApp/createAppPackage";
import { CreateAppPackageArgs } from "../component/driver/teamsApp/interfaces/CreateAppPackageArgs";
import { EnvLoaderMW, EnvWriterMW } from "../component/middleware/envMW";
import { envUtil } from "../component/utils/envUtil";
import { settingsUtil } from "../component/utils/settingsUtil";
import { DotenvParseOutput } from "dotenv";
import { ProjectMigratorMWV3 } from "./middleware/projectMigratorV3";
import {
  containsUnsupportedFeature,
  getFeaturesFromAppDefinition,
} from "../component/resource/appManifest/utils/utils";
import { CoreTelemetryEvent, CoreTelemetryProperty } from "./telemetry";
import { isValidProjectV2, isValidProjectV3 } from "../common/projectSettingsHelper";
import {
  getVersionState,
  getProjectVersionFromPath,
  getTrackingIdFromPath,
} from "./middleware/utils/v3MigrationUtils";
import { QuestionMW } from "../component/middleware/questionMW";
import {
  getQuestionsForAddWebpart,
  getQuestionsForCreateAppPackage,
  getQuestionsForInit,
  getQuestionsForProvisionV3,
  getQuestionsForUpdateTeamsApp,
  getQuestionsForValidateManifest,
  getQuestionsForValidateAppPackage,
} from "../component/question";
import { buildAadManifest } from "../component/driver/aad/utility/buildAadManifest";
import { MissingEnvInFileUserError } from "../component/driver/aad/error/missingEnvInFileError";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { VersionSource, VersionState } from "../common/versionMetadata";
import { pathUtils } from "../component/utils/pathUtils";
import { isV3Enabled } from "../common/tools";
import { AddWebPartDriver } from "../component/driver/add/addWebPart";
import { AddWebPartArgs } from "../component/driver/add/interface/AddWebPartArgs";
import { SPFXQuestionNames } from "../component/resource/spfx/utils/questions";
import { FileNotFoundError, InvalidProjectError } from "../error/common";
import { CoreQuestionNames, validateAadManifestContainsPlaceholder } from "./question";
import { YamlFieldMissingError } from "../error/yml";
import { checkPermissionFunc, grantPermissionFunc, listCollaboratorFunc } from "./FxCore";
import { pathToFileURL } from "url";
import { VSCodeExtensionCommand } from "../common/constants";

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

  @hooks([ErrorHandlerMW, QuestionMW(getQuestionsForCreateProjectV2), ContextInjectorMW])
  async createProject(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<string, FxError>> {
    if (!ctx) {
      return err(new ObjectIsUndefinedError("ctx for createProject"));
    }
    setCurrentStage(Stage.create);
    inputs.stage = Stage.create;
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
    ctx.projectSettings = context.projectSetting;
    inputs.projectPath = context.projectPath;
    return ok(inputs.projectPath!);
  }

  @hooks([
    ErrorHandlerMW,
    QuestionMW((inputs) => {
      return getQuestionsForInit("infra", inputs);
    }),
  ])
  async initInfra(inputs: Inputs): Promise<Result<undefined, FxError>> {
    const res = await coordinator.initInfra(createContextV3(), inputs);
    return res;
  }

  @hooks([
    ErrorHandlerMW,
    QuestionMW((inputs) => {
      return getQuestionsForInit("debug", inputs);
    }),
  ])
  async initDebug(inputs: Inputs): Promise<Result<undefined, FxError>> {
    const res = await coordinator.initDebug(createContextV3(), inputs);
    return res;
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionMW(getQuestionsForProvisionV3),
    EnvLoaderMW(false),
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async provisionResources(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    setCurrentStage(Stage.provision);
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
    setCurrentStage(Stage.deploy);
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
    ConcurrentLockerMW,
    QuestionModelMW,
    EnvLoaderMW(true, true),
    ContextInjectorMW,
  ])
  async deployAadManifest(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    setCurrentStage(Stage.deployAad);
    inputs.stage = Stage.deployAad;
    const updateAadClient = Container.get<UpdateAadAppDriver>("aadApp/update");
    // In V3, the aad.template.json exist at .fx folder, and output to root build folder.
    const manifestTemplatePath: string = inputs[CoreQuestionNames.AadAppManifestFilePath];
    if (!(await fs.pathExists(manifestTemplatePath))) {
      return err(new FileNotFoundError("deployAadManifest", manifestTemplatePath));
    }
    let manifestOutputPath: string = manifestTemplatePath;
    if (inputs.env && !(await validateAadManifestContainsPlaceholder(undefined, inputs))) {
      await fs.ensureDir(path.join(inputs.projectPath!, "build"));
      manifestOutputPath = path.join(inputs.projectPath!, "build", `aad.${inputs.env}.json`);
    }
    const inputArgs: UpdateAadAppArgs = {
      manifestPath: manifestTemplatePath,
      outputFilePath: manifestOutputPath,
    };
    const contextV3: DriverContext = createDriverContext(inputs);
    const res = await updateAadClient.run(inputArgs, contextV3);
    if (res.isErr()) {
      if (res.error instanceof MissingEnvInFileUserError) {
        res.error.message += " " + getDefaultString("error.UpdateAadManifest.MissingEnvHint"); // hint users can run provision/debug to create missing env for our project template
        if (res.error.displayMessage) {
          res.error.displayMessage +=
            " " + getLocalizedString("error.UpdateAadManifest.MissingEnvHint");
        }
      }
      return err(res.error);
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
    setCurrentStage(Stage.publish);
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
    QuestionMW(getQuestionsForUpdateTeamsApp),
    ConcurrentLockerMW,
    EnvLoaderMW(true),
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async deployTeamsManifest(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    inputs.manifestTemplatePath = inputs[CoreQuestionNames.TeamsAppManifestFilePath] as string;
    const context = createContextV3(ctx?.projectSettings as ProjectSettingsV3);
    const component = Container.get("app-manifest") as any;
    const res = await component.deployV3(context, inputs as InputsWithProjectPath);
    if (res.isOk()) {
      ctx!.envVars = envUtil.map2object(res.value);
    }
    return res;
  }

  @hooks([ErrorHandlerMW, ProjectMigratorMWV3, EnvLoaderMW(false), ConcurrentLockerMW])
  async executeUserTask(
    func: Func,
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<any, FxError>> {
    let res: Result<any, FxError> = ok(undefined);
    const context = createDriverContext(inputs);
    if (func.method === "getManifestTemplatePath") {
      const path = await manifestUtils.getTeamsAppManifestPath(
        (inputs as InputsWithProjectPath).projectPath
      );
      res = ok(path);
    } else if (func.method === "addSso") {
      inputs.stage = Stage.addFeature;
      inputs[AzureSolutionQuestionNames.Features] = SingleSignOnOptionItem.id;
      const component = Container.get("sso") as any;
      res = await component.add(context, inputs as InputsWithProjectPath);
    } else if (func.method === "buildAadManifest") {
      res = await this.previewAadManifest(inputs);
    }
    return res;
  }

  @hooks([
    ErrorHandlerMW,
    QuestionMW(getQuestionsForAddWebpart),
    ProjectMigratorMWV3,
    ConcurrentLockerMW,
  ])
  async addWebpart(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    const driver: AddWebPartDriver = Container.get<AddWebPartDriver>("spfx/add");
    const args: AddWebPartArgs = {
      manifestPath: inputs[SPFxQuestionNames.ManifestPath],
      localManifestPath: inputs[SPFxQuestionNames.LocalManifestPath],
      spfxFolder: inputs[SPFxQuestionNames.SPFxFolder],
      webpartName: inputs[SPFxQuestionNames.WebPartName],
      spfxPackage: inputs[SPFXQuestionNames.use_global_package_or_install_local],
    };
    const contextV3: DriverContext = createDriverContext(inputs);
    return await driver.run(args, contextV3);
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextInjectorMW])
  async publishInDeveloperPortal(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    setCurrentStage(Stage.publishInDeveloperPortal);
    inputs.stage = Stage.publishInDeveloperPortal;
    const context = createContextV3();
    return await coordinator.publishInDeveloperPortal(context, inputs as InputsWithProjectPath);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionModelMW,
    EnvLoaderMW(false, true),
    ProjectSettingsLoaderMW, // this middleware is for v2 and will be removed after v3 refactor
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async grantPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    return grantPermissionFunc(inputs, ctx);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionModelMW,
    EnvLoaderMW(false, true),
    ProjectSettingsLoaderMW, // this middleware is for v2 and will be removed after v3 refactor
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async checkPermission(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    return checkPermissionFunc(inputs, ctx);
  }

  @hooks([
    ErrorHandlerMW,
    ProjectMigratorMWV3,
    QuestionModelMW,
    EnvLoaderMW(false, true),
    ProjectSettingsLoaderMW, // this middleware is for v2 and will be removed after v3 refactor
    ConcurrentLockerMW,
    ContextInjectorMW,
    EnvWriterMW,
  ])
  async listCollaborator(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    return listCollaboratorFunc(inputs, ctx);
  }

  async getSettings(inputs: InputsWithProjectPath): Promise<Result<Settings, FxError>> {
    return settingsUtil.readSettings(inputs.projectPath);
  }

  @hooks([ErrorHandlerMW, EnvLoaderMW(true), ContextInjectorMW])
  async getDotEnv(
    inputs: InputsWithProjectPath,
    ctx?: CoreHookContext
  ): Promise<Result<DotenvParseOutput | undefined, FxError>> {
    return ok(ctx?.envVars);
  }

  @hooks([ErrorHandlerMW, ProjectMigratorMWV3])
  async phantomMigrationV3(inputs: Inputs): Promise<Result<Void, FxError>> {
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
      let isSupport: VersionState;
      // As projectVersionCheck is a v3 interface, v3 not enabled case is an exception and only called by vs platform
      if (!isV3Enabled() && inputs.platform === Platform.VS) {
        if (versionInfo.source === VersionSource.projectSettings) {
          isSupport = VersionState.compatible;
        } else {
          isSupport = VersionState.unsupported;
        }
      } else {
        isSupport = getVersionState(versionInfo);
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
    ConcurrentLockerMW,
    EnvLoaderMW(false),
    ContextInjectorMW,
  ])
  async preProvisionForVS(
    inputs: Inputs,
    ctx?: CoreHookContext
  ): Promise<Result<PreProvisionResForVS, FxError>> {
    const context = createDriverContext(inputs);
    return coordinator.preProvisionForVS(context, inputs as InputsWithProjectPath);
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextInjectorMW])
  async createEnv(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<Void, FxError>> {
    if (!ctx || !inputs.projectPath)
      return err(new ObjectIsUndefinedError("createEnv input stuff"));

    const createEnvCopyInput = await askNewEnvironment(ctx!, inputs);
    if (
      !createEnvCopyInput ||
      !createEnvCopyInput.targetEnvName ||
      !createEnvCopyInput.sourceEnvName
    ) {
      return err(UserCancelError);
    }

    return this.createEnvCopyV3(
      createEnvCopyInput.targetEnvName,
      createEnvCopyInput.sourceEnvName,
      inputs.projectPath
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

  async previewAadManifest(inputs: Inputs): Promise<Result<Void, FxError>> {
    const manifestTemplatePath: string = inputs.AAD_MANIFEST_FILE
      ? inputs.AAD_MANIFEST_FILE
      : path.join(inputs.projectPath!, AadConstants.DefaultTemplateFileName);
    if (!(await fs.pathExists(manifestTemplatePath))) {
      return err(new FileNotFoundError("previewAadManifest", manifestTemplatePath));
    }
    await fs.ensureDir(path.join(inputs.projectPath!, "build"));
    const manifestOutputPath: string = path.join(
      inputs.projectPath!,
      "build",
      `aad.${inputs.env}.json`
    );
    const contextV3: DriverContext = createDriverContext(inputs);
    await buildAadManifest(contextV3, manifestTemplatePath, manifestOutputPath);
    return ok(Void);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    QuestionMW(getQuestionsForValidateManifest),
    EnvLoaderMW(true),
  ])
  async validateManifest(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    setCurrentStage(Stage.validateApplication);
    inputs.stage = Stage.validateApplication;

    const context: DriverContext = createDriverContext(inputs);

    const teamsAppManifestFilePath = inputs?.[CoreQuestionNames.TeamsAppManifestFilePath] as string;
    const args: ValidateManifestArgs = {
      manifestPath: teamsAppManifestFilePath,
    };
    const driver: ValidateManifestDriver = Container.get("teamsApp/validateManifest");
    const result = await driver.run(args, context);
    if (result.isOk() && context.platform !== Platform.VS) {
      const validationSuccess = getLocalizedString("plugins.appstudio.validationSucceedNotice");
      context.ui?.showMessage("info", validationSuccess, false);
    }
    return result;
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, QuestionMW(getQuestionsForValidateAppPackage)])
  async validateAppPackage(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    setCurrentStage(Stage.validateApplication);
    inputs.stage = Stage.validateApplication;

    const context: DriverContext = createDriverContext(inputs);
    const teamsAppPackageFilePath = inputs?.[CoreQuestionNames.TeamsAppPackageFilePath] as string;
    const args: ValidateAppPackageArgs = {
      appPackagePath: teamsAppPackageFilePath,
    };
    const driver: ValidateAppPackageDriver = Container.get("teamsApp/validateAppPackage");
    return await driver.run(args, context);
  }

  @hooks([
    ErrorHandlerMW,
    ConcurrentLockerMW,
    QuestionMW(getQuestionsForCreateAppPackage),
    EnvLoaderMW(true),
  ])
  async createAppPackage(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
    setCurrentStage(Stage.createAppPackage);
    inputs.stage = Stage.createAppPackage;

    const context: DriverContext = createDriverContext(inputs);

    const teamsAppManifestFilePath = inputs?.[CoreQuestionNames.TeamsAppManifestFilePath] as string;

    const driver: CreateAppPackageDriver = Container.get("teamsApp/zipAppPackage");
    const args: CreateAppPackageArgs = {
      manifestPath: teamsAppManifestFilePath,
      outputZipPath:
        inputs[CoreQuestionNames.OutputZipPathParamName] ??
        `${inputs.projectPath}/${BuildFolderName}/${AppPackageFolderName}/appPackage.${process.env.TEAMSFX_ENV}.zip`,
      outputJsonPath:
        inputs[CoreQuestionNames.OutputManifestParamName] ??
        `${inputs.projectPath}/${BuildFolderName}/${AppPackageFolderName}/manifest.${process.env.TEAMSFX_ENV}.json`,
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
}
