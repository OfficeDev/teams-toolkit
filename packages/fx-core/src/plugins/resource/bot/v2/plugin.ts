// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, Json, ok, Result, TokenProvider, v2, Void } from "@microsoft/teamsfx-api";
import {
  Context,
  DeepReadonly,
  DeploymentInputs,
  EnvInfoV2,
  ProvisionInputs,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { scaffold } from "./scaffold";
import * as utils from "../utils/common";
import path from "path";
import { AzureHostingFactory } from "../../../../common/azure-hosting/hostingFactory";
import { Commands, CommonStrings, ConfigNames, PluginBot } from "../resources/strings";
import { checkAndThrowIfMissing, checkPrecondition, CommandExecutionError } from "../errors";
import {
  BicepConfigs,
  BicepContext,
  ServiceType,
} from "../../../../common/azure-hosting/interfaces";
import {
  Alias,
  DEFAULT_DOTNET_FRAMEWORK,
  DeployConfigs,
  FolderNames,
  ProgressBarConstants,
} from "../constants";
import { mergeTemplates } from "../../../../common/azure-hosting/utils";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { ResourcePlugins } from "../../../../common/constants";
import { Messages } from "../resources/messages";
import fs from "fs-extra";
import { forEachFileAndDir } from "../utils/dir-walk";
import { Logger } from "../logger";
import { ProgressBarFactory } from "../progressBars";
import ignore, { Ignore } from "ignore";
import { DeployConfigsConstants } from "../../../../common/azure-hosting/hostingConstant";
import { getTemplateInfos, resolveHostType, resolveServiceType } from "./common";
import { ProgrammingLanguage } from "./enum";
import { getLanguage, getProjectFileName, getRuntime, moduleMap } from "./mapping";

export class TeamsBotV2Impl {
  readonly name: string = PluginBot.PLUGIN_NAME;

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    Logger.info(Messages.ScaffoldingBot);

    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.SCAFFOLD_TITLE,
      ProgressBarConstants.SCAFFOLD_STEPS_NUM,
      ctx
    );
    await handler?.start(ProgressBarConstants.SCAFFOLD_STEP_START);
    const lang = getLanguage(ctx.projectSetting.programmingLanguage);
    const projectPath = checkPrecondition(Messages.WorkingDirIsMissing, inputs.projectPath);
    const workingPath = TeamsBotV2Impl.getWorkingPath(projectPath, lang);
    const hostType = resolveHostType(inputs);
    utils.checkAndSavePluginSettingV2(ctx, PluginBot.HOST_TYPE, hostType);
    const templateInfos = getTemplateInfos(ctx, inputs);

    await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_FETCH_ZIP);
    await Promise.all(
      templateInfos.map(async (templateInfo) => {
        await scaffold(templateInfo, workingPath);
      })
    );

    await ProgressBarFactory.closeProgressBar(true, ProgressBarConstants.SCAFFOLD_TITLE);
    Logger.info(Messages.SuccessfullyScaffoldedBot);
    return ok(Void);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    Logger.info(Messages.GeneratingArmTemplatesBot);

    const bicepContext = TeamsBotV2Impl.getBicepContext(ctx, inputs);
    const serviceTypes = [resolveServiceType(ctx), ServiceType.BotService];
    const templates = await Promise.all(
      serviceTypes.map((serviceType) => {
        const hosting = AzureHostingFactory.createHosting(serviceType);
        hosting.setLogger(Logger);
        return hosting.generateBicep(bicepContext);
      })
    );
    const result = mergeTemplates(templates);

    Logger.info(Messages.SuccessfullyGenerateArmTemplatesBot);
    return ok({ kind: "bicep", template: result });
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    Logger.info(Messages.UpdatingArmTemplatesBot);

    const bicepContext = TeamsBotV2Impl.getBicepContext(ctx, inputs);
    const serviceTypes = [resolveServiceType(ctx), ServiceType.BotService];
    const templates = await Promise.all(
      serviceTypes.map((serviceType) => {
        const hosting = AzureHostingFactory.createHosting(serviceType);
        hosting.setLogger(Logger);
        return hosting.updateBicep(bicepContext);
      })
    );
    const result = mergeTemplates(templates);

    Logger.info(Messages.SuccessfullyUpdateArmTemplatesBot);
    return ok({ kind: "bicep", template: result });
  }

  static getBicepContext(ctx: v2.Context, inputs: Inputs): BicepContext {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const bicepConfigs = TeamsBotV2Impl.getBicepConfigs(ctx, inputs);
    return {
      plugins: plugins.map((obj) => obj.name),
      configs: bicepConfigs,
      moduleNames: moduleMap,
      moduleAlias: Alias.BICEP_MODULE,
      pluginId: ResourcePlugins.Bot,
    };
  }

  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    Logger.info(Messages.DeployingBot);

    const projectPath = checkPrecondition(Messages.WorkingDirIsMissing, inputs.projectPath);
    const language = getLanguage(ctx.projectSetting.programmingLanguage);
    const workingPath = TeamsBotV2Impl.getWorkingPath(projectPath, language);
    const projectFileName = getProjectFileName(getRuntime(language), ctx.projectSetting.appName);
    const hostType = resolveServiceType(ctx);
    const deployDir = path.join(workingPath, DeployConfigs.DEPLOYMENT_FOLDER);
    const configFile = TeamsBotV2Impl.configFile(workingPath);
    const deploymentZipCacheFile = path.join(
      deployDir,
      DeployConfigsConstants.DEPLOYMENT_ZIP_CACHE_FILE
    );
    const envName = checkAndThrowIfMissing(ConfigNames.ENV, inputs.env);

    // list of files that need to be detected for both file changes and uploads
    const generalIgnore = await TeamsBotV2Impl.generateIgnoreRules(
      await TeamsBotV2Impl.ensureIgnoreFile(hostType, workingPath),
      workingPath
    );

    // For backward compatibility, get resource id from both key `botWebAppResourceId` and `resourceId`
    // get Azure resources definition
    const botWebAppResourceId = (envInfo as v2.EnvInfoV2).state[this.name][
      PluginBot.BOT_WEB_APP_RESOURCE_ID
    ];
    const resourceId = checkPrecondition(
      Messages.SomethingIsMissing(PluginBot.RESOURCE_ID),
      (envInfo as v2.EnvInfoV2).state[this.name][PluginBot.RESOURCE_ID] ?? botWebAppResourceId
    );

    // create config file if not exists
    await fs.ensureDir(deployDir);
    await TeamsBotV2Impl.initDeployConfig(ctx, configFile, envName);
    if (!(await TeamsBotV2Impl.needDeploy(workingPath, configFile, envName))) {
      Logger.warning(Messages.SkipDeployNoUpdates);
      return ok(Void);
    }
    const progressBarHandler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.DEPLOY_TITLE,
      ProgressBarConstants.DEPLOY_STEPS_NUM,
      ctx
    );
    // progress start
    await progressBarHandler.start(ProgressBarConstants.DEPLOY_STEP_START);
    // build
    await progressBarHandler.next(ProgressBarConstants.DEPLOY_STEP_NPM_INSTALL);
    const zippedPath = await TeamsBotV2Impl.localBuild(language, workingPath, projectFileName);

    // pack
    await progressBarHandler.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
    const zipBuffer = await utils.zipFolderAsync(
      zippedPath,
      deploymentZipCacheFile,
      await TeamsBotV2Impl.prepareIgnore(generalIgnore)
    );

    // upload
    const host = AzureHostingFactory.createHosting(hostType);
    host.setLogger(Logger);
    await progressBarHandler.next(ProgressBarConstants.DEPLOY_STEP_ZIP_DEPLOY);
    await host.deploy(resourceId, tokenProvider, zipBuffer);
    const deployTimeCandidate = Date.now();
    await TeamsBotV2Impl.saveDeploymentInfo(
      configFile,
      envName,
      deployTimeCandidate,
      deploymentZipCacheFile,
      zipBuffer
    );

    // close bar
    await ProgressBarFactory.closeProgressBar(true, ProgressBarConstants.DEPLOY_TITLE);
    Logger.info(Messages.SuccessfullyDeployedBot);
    return ok(Void);
  }

  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: EnvInfoV2
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async configureLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: v2.EnvInfoV2 | undefined
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  private static getBicepConfigs(ctx: Context, inputs: Inputs): BicepConfigs {
    const bicepConfigs: BicepConfigs = [];
    const lang = getLanguage(ctx.projectSetting.programmingLanguage);
    bicepConfigs.push(getRuntime(lang));
    bicepConfigs.push("running-on-azure");
    return bicepConfigs;
  }

  private static async localBuild(
    lang: ProgrammingLanguage,
    workingPath: string,
    projectFileName: string
  ): Promise<string> {
    // Return the folder path to be zipped and uploaded

    if (lang === ProgrammingLanguage.Ts) {
      //Typescript needs tsc build before deploy because of Windows app server. other languages don"t need it.
      try {
        await utils.execute("npm install", workingPath);
        await utils.execute("npm run build", workingPath);
        return workingPath;
      } catch (e) {
        throw new CommandExecutionError(
          `${Commands.NPM_INSTALL},${Commands.NPM_BUILD}`,
          workingPath,
          e
        );
      }
    }

    if (lang === ProgrammingLanguage.Js) {
      try {
        // fail to npm install @microsoft/teamsfx on azure web app, so pack it locally.
        await utils.execute("npm install", workingPath);
        return workingPath;
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL}`, workingPath, e);
      }
    }

    if (lang === ProgrammingLanguage.Csharp) {
      try {
        const framework = await TeamsBotV2Impl.getFrameworkVersion(
          path.join(workingPath, projectFileName)
        );
        await utils.execute(`dotnet publish --configuration Release`, workingPath);
        return path.join(workingPath, "bin", "Release", framework, "publish");
      } catch (e) {
        throw new CommandExecutionError(`dotnet publish`, workingPath, e);
      }
    }

    throw new Error("Invalid programming language");
  }

  /**
   * create deploy log file if not exists
   * @param ctx context
   * @param configFile the config file needed to write
   * @param envName name of the env
   * @private
   */
  private static async initDeployConfig(ctx: Context, configFile: string, envName: string) {
    if (!(await fs.pathExists(configFile))) {
      try {
        await fs.writeJSON(configFile, { [envName]: { time: 0 } });
      } catch (e) {
        await Logger.debug(
          `init deploy json failed with target file: ${configFile} with error: ${e}.`
        );
      }
    }
  }

  /**
   * determine if dir need deploy, or all file are not changed after last deploy
   * @param workingPath base dir
   * @param configFile config file location
   * @param env current env
   */
  static async needDeploy(workingPath: string, configFile: string, env: string): Promise<boolean> {
    const botDeployJson = await fs.readJSON(configFile);
    const lastTime = Math.max(botDeployJson[env]?.time ?? 0, 0);
    // prepare ignore file
    const gitIgnore = await TeamsBotV2Impl.generateIgnoreRules(
      DeployConfigsConstants.GIT_IGNORE_FILE,
      workingPath
    );
    // general ignore will ignore ts file, so source change will not trigger rebuild and redeploy
    // so just use git ignore will be ok
    const totalIgnore = await TeamsBotV2Impl.prepareIgnore(gitIgnore);
    const filter = (itemPath: string) => path.basename(itemPath) !== FolderNames.NODE_MODULES;

    let changed = false;
    try {
      await forEachFileAndDir(
        workingPath,
        (itemPath, status) => {
          const relativePath = path.relative(workingPath, itemPath);
          if (
            relativePath &&
            status.mtime.getTime() > lastTime &&
            !totalIgnore.test(relativePath).ignored
          ) {
            changed = true;
            return true;
          }
        },
        filter
      );
      return changed;
    } catch {
      return true;
    }
  }

  private static async saveDeploymentInfo(
    configFile: string,
    env: string,
    time: number,
    deploymentZipCacheFile: string,
    zipContent: Buffer
  ) {
    const botDeployJson = await fs.readJSON(configFile);
    botDeployJson[env] = {
      time: time,
    };
    try {
      await Promise.all([
        fs.writeJSON(configFile, botDeployJson),
        fs.writeFile(deploymentZipCacheFile, zipContent),
      ]);
    } catch (e) {
      Logger.debug(`writeJson ${configFile} failed with error: ${e}.`);
    }
  }

  private static async prepareIgnore(rules: string[]): Promise<Ignore> {
    const ig = ignore().add(DeployConfigs.DEPLOYMENT_FOLDER);
    for (const rule of rules) {
      ig.add(rule);
    }

    return ig;
  }

  /**
   * read every line from workDir/filename and return workDir/[lineContent]
   * @param fileName file name
   * @param workingPath base dir
   */
  public static async generateIgnoreRules(
    fileName: string,
    workingPath: string
  ): Promise<string[]> {
    if (!fileName) {
      return [];
    }
    let result: string[] = [];
    const ignoreFilePath = path.join(workingPath, fileName);
    if (await fs.pathExists(ignoreFilePath)) {
      const ignoreFileContent = await fs.readFile(ignoreFilePath);
      result = ignoreFileContent
        .toString()
        .split("\n")
        .map((line) => line.trim());
    }

    return result;
  }

  private static async ensureIgnoreFile(
    hostType: ServiceType,
    workingPath: string
  ): Promise<string> {
    const defaultAppIgnore = DeployConfigs.WALK_SKIP_PATHS.join("\n");
    switch (hostType) {
      case ServiceType.Functions:
        return DeployConfigsConstants.FUNC_IGNORE_FILE;
      case ServiceType.AppService: {
        const fileName = `.${hostType.toString()}ignore`;
        if (!fs.existsSync(path.join(workingPath, fileName))) {
          await fs.writeFile(path.join(workingPath, fileName), defaultAppIgnore);
        }
        return fileName;
      }
      default:
        return "";
    }
  }

  private static configFile(workingDir: string): string {
    return path.join(
      workingDir,
      DeployConfigs.DEPLOYMENT_FOLDER,
      DeployConfigsConstants.DEPLOYMENT_INFO_FILE
    );
  }

  /**
   * read dotnet framework version from project file
   * @param projectFilePath project base folder
   */
  private static async getFrameworkVersion(projectFilePath: string): Promise<string> {
    const reg = /(?<=<TargetFramework>)(.*)(?=<)/gim;
    const content = await fs.readFile(projectFilePath, "utf8");
    const framework = content.match(reg);
    if (framework?.length) {
      return framework[0].trim();
    }
    return DEFAULT_DOTNET_FRAMEWORK;
  }

  private static getWorkingPath(projectPath: string, language: ProgrammingLanguage): string {
    return language === ProgrammingLanguage.Csharp
      ? projectPath
      : path.join(projectPath, CommonStrings.BOT_WORKING_DIR_NAME);
  }
}

export default new TeamsBotV2Impl();
