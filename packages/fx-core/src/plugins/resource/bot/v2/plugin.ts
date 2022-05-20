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
import { BicepConfigs, ServiceType } from "../../../../common/azure-hosting/interfaces";
import { getSiteNameFromResourceId } from "../../../../common";
import {
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
import { getLanguage, getRuntime } from "./mapping";

export class TeamsBotV2Impl {
  readonly name: string = PluginBot.PLUGIN_NAME;

  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    let workingPath = inputs.projectPath ?? "";
    const lang = getLanguage(ctx.projectSetting.programmingLanguage);
    if (lang !== ProgrammingLanguage.Csharp) {
      workingPath = path.join(workingPath, "bot");
    }
    const hostType = resolveHostType(inputs);
    utils.checkAndSavePluginSettingV2(ctx, PluginBot.HOST_TYPE, hostType);

    const templateInfos = getTemplateInfos(ctx, inputs);
    await Promise.all(
      templateInfos.map(async (templateInfo) => {
        await scaffold(templateInfo, workingPath);
      })
    );

    return ok(Void);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const bicepConfigs = TeamsBotV2Impl.getBicepConfigs(ctx, inputs);
    const bicepContext = {
      plugins: plugins.map((obj) => obj.name),
      configs: bicepConfigs,
    };

    const serviceTypes = [resolveServiceType(ctx), ServiceType.BotService];
    const templates = await Promise.all(
      serviceTypes.map((serviceType) => {
        const hosting = AzureHostingFactory.createHosting(serviceType);
        return hosting.generateBicep(bicepContext, ResourcePlugins.Bot);
      })
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const bicepConfigs = TeamsBotV2Impl.getBicepConfigs(ctx, inputs);
    const bicepContext = {
      plugins: plugins.map((obj) => obj.name),
      configs: bicepConfigs,
    };

    const serviceTypes = [resolveServiceType(ctx), ServiceType.BotService];
    const templates = await Promise.all(
      serviceTypes.map((serviceType) => {
        const hosting = AzureHostingFactory.createHosting(serviceType);
        return hosting.updateBicep(bicepContext, ResourcePlugins.Bot);
      })
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
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
    const projectPath = checkPrecondition(Messages.WorkingDirIsMissing, inputs.projectPath);
    const workingDir = path.join(projectPath, CommonStrings.BOT_WORKING_DIR_NAME);
    const hostType = resolveServiceType(ctx);
    const deployDir = path.join(workingDir, DeployConfigs.DEPLOYMENT_FOLDER);
    const configFile = TeamsBotV2Impl.configFile(hostType, workingDir);
    const deploymentZipCacheFile = path.join(
      deployDir,
      DeployConfigsConstants.DEPLOYMENT_ZIP_CACHE_FILE
    );
    const envName = checkAndThrowIfMissing(ConfigNames.ENV, inputs.env);

    // list of files that need to be detected for both file changes and uploads
    const generalIgnore = await TeamsBotV2Impl.generateIgnoreRules(
      await TeamsBotV2Impl.ensureIgnoreFile(hostType, workingDir),
      workingDir
    );

    // get Azure resources definition
    const botWebAppResourceId = (envInfo as v2.EnvInfoV2).state[this.name][
      PluginBot.BOT_WEB_APP_RESOURCE_ID
    ];
    const siteName = getSiteNameFromResourceId(botWebAppResourceId);

    // create config file if not exists
    await fs.ensureDir(deployDir);
    await TeamsBotV2Impl.initDeployConfig(ctx, configFile, envName);
    if (!(await TeamsBotV2Impl.needDeploy(generalIgnore, workingDir, configFile, envName))) {
      await ctx.logProvider.warning(Messages.SkipDeployNoUpdates);
      return ok(Void);
    }
    const deployTimeCandidate = Date.now();
    const progressBarHandler = ctx.userInteraction.createProgressBar(
      ProgressBarConstants.DEPLOY_TITLE,
      ProgressBarConstants.DEPLOY_STEPS_NUM
    );
    // progress start
    await progressBarHandler.start(ProgressBarConstants.DEPLOY_STEP_START);
    // build
    await progressBarHandler.next(ProgressBarConstants.DEPLOY_STEP_NPM_INSTALL);
    await TeamsBotV2Impl.localBuild(ctx, inputs, projectPath);

    // pack
    await progressBarHandler.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
    const zipBuffer = await utils.zipFolderAsync(
      workingDir,
      deploymentZipCacheFile,
      await TeamsBotV2Impl.prepareIgnore(generalIgnore)
    );

    // upload
    const host = AzureHostingFactory.createHosting(hostType);
    await progressBarHandler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_DEPLOY);
    await host.deploy(inputs, tokenProvider, zipBuffer, siteName);
    await TeamsBotV2Impl.saveDeploymentInfo(
      configFile,
      envName,
      deployTimeCandidate,
      deploymentZipCacheFile,
      zipBuffer
    );

    // close bar
    await ProgressBarFactory.closeProgressBar(true, ProgressBarConstants.DEPLOY_TITLE);
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
    ctx: Context,
    inputs: Inputs,
    projectPath: string
  ): Promise<string> {
    // Return the folder path to be zipped and uploaded

    const lang = getLanguage(ctx.projectSetting.programmingLanguage);
    const packDir = path.join(projectPath, CommonStrings.BOT_WORKING_DIR_NAME);
    if (lang === ProgrammingLanguage.Ts) {
      //Typescript needs tsc build before deploy because of Windows app server. other languages don"t need it.
      try {
        await utils.execute("npm install", packDir);
        await utils.execute("npm run build", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL},${Commands.NPM_BUILD}`, e);
      }
    }

    if (lang === ProgrammingLanguage.Js) {
      try {
        // fail to npm install @microsoft/teamsfx on azure web app, so pack it locally.
        await utils.execute("npm install", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL}`, e);
      }
    }

    if (lang === ProgrammingLanguage.Csharp) {
      try {
        const runtime = await TeamsBotV2Impl.getFrameworkVersion(projectPath);
        await utils.execute(
          `dotnet publish --configuration Release --runtime ${runtime} --self-contained`,
          packDir
        );
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`dotnet publish`, e);
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
        await ctx.logProvider.debug(
          `init deploy json failed with target file: ${configFile} with error: ${e}.`
        );
      }
    }
  }

  /**
   * determine if dir need deploy, or all file are not changed after last deploy
   * @param generalIgnore none touch file
   * @param workingDir base dir
   * @param configFile config file location
   * @param env current env
   */
  static async needDeploy(
    generalIgnore: string[],
    workingDir: string,
    configFile: string,
    env: string
  ): Promise<boolean> {
    const botDeployJson = await fs.readJSON(configFile);
    const lastTime = Math.max(botDeployJson[env]?.time ?? 0, 0);
    // prepare ignore file
    const gitIgnore = await TeamsBotV2Impl.generateIgnoreRules(
      DeployConfigsConstants.GIT_IGNORE_FILE,
      workingDir
    );
    const totalIgnore = await TeamsBotV2Impl.prepareIgnore(
      [FolderNames.NODE_MODULES].concat(generalIgnore).concat(gitIgnore)
    );

    await forEachFileAndDir(
      workingDir,
      (itemPath, status) => {
        const relativePath = path.relative(workingDir, itemPath);
        if (relativePath && status.mtime.getTime() > lastTime) {
          return true;
        }
      },
      (item) => {
        return !totalIgnore.test(item).ignored;
      }
    );
    return false;
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
   * @param workingDir base dir
   */
  public static async generateIgnoreRules(fileName: string, workingDir: string): Promise<string[]> {
    if (!fileName) {
      return [];
    }
    let result: string[] = [];
    const ignoreFilePath = path.join(workingDir, fileName);
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
    workingDir: string
  ): Promise<string> {
    const defaultAppIgnore = DeployConfigs.WALK_SKIP_PATHS.join("\n");
    switch (hostType) {
      case ServiceType.Functions:
        return DeployConfigsConstants.FUNC_IGNORE_FILE;
      case ServiceType.AppService: {
        const fileName = `.${hostType.toString()}ignore`;
        if (!fs.existsSync(path.join(workingDir, fileName))) {
          await fs.writeFile(path.join(workingDir, fileName), defaultAppIgnore);
        }
        return fileName;
      }
      default:
        return "";
    }
  }

  private static configFile(serviceType: ServiceType, workingDir: string): string {
    switch (serviceType) {
      case ServiceType.AppService:
        return path.join(workingDir, DeployConfigs.DEPLOYMENT_CONFIG_FILE);
      case ServiceType.Functions:
        return path.join(
          workingDir,
          DeployConfigs.DEPLOYMENT_FOLDER,
          DeployConfigsConstants.DEPLOYMENT_INFO_FILE
        );
      default:
        return "";
    }
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
}

export default new TeamsBotV2Impl();
