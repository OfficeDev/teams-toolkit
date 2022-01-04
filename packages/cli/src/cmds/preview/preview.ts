// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as fs from "fs-extra";
import { Argv } from "yargs";
import {
  AzureSolutionSettings,
  Colors,
  err,
  FxError,
  Inputs,
  LogLevel,
  ok,
  Platform,
  ProjectConfig,
  Result,
} from "@microsoft/teamsfx-api";
import {
  FxCore,
  ITaskDefinition,
  TaskDefinition,
  ProjectSettingsHelper,
} from "@microsoft/teamsfx-core";

import { YargsCommand } from "../../yargsCommand";
import * as utils from "../../utils";
import * as commonUtils from "./commonUtils";
import * as constants from "./constants";
import cliLogger from "../../commonlib/log";
import * as errors from "./errors";
import activate from "../../activate";
import { Task, TaskResult } from "./task";
import AppStudioTokenInstance from "../../commonlib/appStudioLogin";
import cliTelemetry from "../../telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../telemetry/cliTelemetryEvents";
import { ServiceLogWriter } from "./serviceLogWriter";
import CLIUIInstance from "../../userInteraction";
import { AzureNodeChecker } from "./depsChecker/azureNodeChecker";
import { DotnetChecker } from "./depsChecker/dotnetChecker";
import { FuncToolChecker } from "./depsChecker/funcToolChecker";
import { DepsChecker } from "./depsChecker/checker";
import { cliEnvCheckerLogger } from "./depsChecker/cliLogger";
import { CLIAdapter } from "./depsChecker/cliAdapter";
import { cliEnvCheckerTelemetry } from "./depsChecker/cliTelemetry";
import { URL } from "url";
import { isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import { NgrokChecker } from "./depsChecker/ngrokChecker";

export default class Preview extends YargsCommand {
  public readonly commandHead = `preview`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Preview the current application.";

  private backgroundTasks: Task[] = [];
  private readonly telemetryProperties: { [key: string]: string } = {};
  private serviceLogWriter: ServiceLogWriter | undefined;
  private sharepointSiteUrl: string | undefined;
  public builder(yargs: Argv): Argv<any> {
    yargs.option("local", {
      description: "Preview the application from local, exclusive with --remote",
      boolean: true,
      default: false,
    });
    yargs.option("remote", {
      description: "Preview the application from remote, exclusive with --local",
      boolean: true,
      default: false,
    });
    yargs.option("folder", {
      description: "Select root folder of the project",
      string: true,
      default: "./",
    });
    yargs.option("browser", {
      description: "Select browser to open Teams web client",
      string: true,
      choices: [constants.Browser.chrome, constants.Browser.edge, constants.Browser.default],
      default: constants.Browser.default,
    });
    yargs.option("browser-arg", {
      description:
        'Argument to pass to the browser, requires --browser, can be used multiple times (e.g. --browser-args="--guest")',
      string: true,
    });
    yargs.option("sharepoint-site", {
      description:
        "SharePoint site URL, like {your-tenant-name}.sharepoint.com [only for SPFx project remote preview]",
      array: false,
      string: true,
    });
    yargs.option("env", {
      description: "Select an existing env for the project",
      string: true,
    });

    return yargs.version(false);
  }

  public async runCommand(args: {
    [argName: string]: boolean | string | string[] | undefined;
  }): Promise<Result<null, FxError>> {
    try {
      let previewType = "";
      if ((args.local && !args.remote) || (!args.local && !args.remote)) {
        previewType = "local";
      } else if (!args.local && args.remote) {
        previewType = "remote";
      }
      this.telemetryProperties[TelemetryProperty.PreviewType] = previewType;

      const workspaceFolder = path.resolve(args.folder as string);
      this.telemetryProperties[TelemetryProperty.PreviewAppId] = utils.getLocalTeamsAppId(
        workspaceFolder
      ) as string;

      cliTelemetry
        .withRootFolder(workspaceFolder)
        .sendTelemetryEvent(TelemetryEvent.PreviewStart, this.telemetryProperties);

      const browser = args.browser as constants.Browser;
      this.telemetryProperties[TelemetryProperty.PreviewBrowser] = browser;

      const browserArguments: string[] = [];
      if (args["browser-arg"]) {
        if (Array.isArray(args["browser-arg"])) {
          args["browser-arg"].forEach((x) => browserArguments.push(x));
        } else {
          browserArguments.push(args["browser-arg"] as string);
        }
      }

      // parse sharepoint site url to get workbench url
      if (args["sharepoint-site"]) {
        try {
          let spSite = args["sharepoint-site"] as string;
          if (!spSite.startsWith("https")) {
            spSite = `https://${spSite}`;
          }
          const spWorkbenchHttpsUrl = new URL("_layouts/workbench.aspx", spSite);
          this.sharepointSiteUrl = spWorkbenchHttpsUrl.toString();
        } catch (error) {
          throw errors.InvalidSharePointSiteURL(error);
        }
      }
      if (args.local && args.remote) {
        throw errors.ExclusiveLocalRemoteOptions();
      }

      const result =
        previewType === "local"
          ? await this.localPreview(workspaceFolder, browser, browserArguments)
          : await this.remotePreview(workspaceFolder, browser, args.env as any, browserArguments);
      if (result.isErr()) {
        throw result.error;
      }
      cliTelemetry.sendTelemetryEvent(TelemetryEvent.Preview, {
        ...this.telemetryProperties,
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
      return ok(null);
    } catch (error) {
      cliTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Preview, error, this.telemetryProperties);
      await this.terminateTasks();
      return err(error);
    }
  }

  private async localPreview(
    workspaceFolder: string,
    browser: constants.Browser,
    browserArguments: string[] = []
  ): Promise<Result<null, FxError>> {
    let coreResult = await activate();
    if (coreResult.isErr()) {
      return err(coreResult.error);
    }
    let core = coreResult.value;

    const inputs: Inputs = {
      projectPath: workspaceFolder,
      platform: Platform.CLI,
      ignoreEnvInfo: isMultiEnvEnabled(), // local debug does not require environments
    };

    let configResult = await core.getProjectConfig(inputs);
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    let config = configResult.value;

    const includeFrontend = ProjectSettingsHelper.includeFrontend(config?.settings);
    const includeBackend = ProjectSettingsHelper.includeBackend(config?.settings);
    const includeBot = ProjectSettingsHelper.includeBot(config?.settings);
    const includeSpfx = ProjectSettingsHelper.isSpfx(config?.settings);

    // TODO: move path validation to core
    const spfxRoot = path.join(workspaceFolder, constants.spfxFolderName);
    if (includeSpfx && !(await fs.pathExists(spfxRoot))) {
      return err(errors.RequiredPathNotExists(spfxRoot));
    }

    const frontendRoot = path.join(workspaceFolder, constants.frontendFolderName);
    if (includeFrontend && !(await fs.pathExists(frontendRoot))) {
      return err(errors.RequiredPathNotExists(frontendRoot));
    }

    const backendRoot = path.join(workspaceFolder, constants.backendFolderName);
    if (includeBackend && !(await fs.pathExists(backendRoot))) {
      return err(errors.RequiredPathNotExists(backendRoot));
    }

    const botRoot = path.join(workspaceFolder, constants.botFolderName);
    if (includeBot && !(await fs.pathExists(botRoot))) {
      return err(errors.RequiredPathNotExists(botRoot));
    }

    if (includeSpfx) {
      return this.spfxPreview(
        workspaceFolder,
        browser,
        "https://localhost:5432/workbench",
        browserArguments
      );
    }

    let skipNgrok: boolean;
    if (isMultiEnvEnabled()) {
      skipNgrok = config?.localSettings?.bot?.get(constants.skipNgrokConfigKey) as boolean;
    } else {
      const skipNgrokConfig = config?.config
        ?.get(constants.localDebugPluginName)
        ?.get(constants.skipNgrokConfigKey) as string;
      skipNgrok = skipNgrokConfig !== undefined && skipNgrokConfig.trim() === "true";
    }

    const envCheckerResult = await this.handleDependences(includeBackend, includeBot, skipNgrok);
    if (envCheckerResult.isErr()) {
      return err(envCheckerResult.error);
    }
    const [funcToolChecker, dotnetChecker, ngrokChecker] = envCheckerResult.value;

    // clear background tasks
    this.backgroundTasks = [];
    // init service log writer
    this.serviceLogWriter = new ServiceLogWriter();
    await this.serviceLogWriter.init();

    /* === start ngrok === */
    if (includeBot && !skipNgrok) {
      const result = await this.startNgrok(workspaceFolder, ngrokChecker);
      if (result.isErr()) {
        return result;
      }
    }

    /* === prepare dev env === */
    let result = await this.prepareDevEnv(
      core,
      inputs,
      workspaceFolder,
      includeFrontend,
      includeBackend,
      includeBot,
      dotnetChecker
    );
    if (result.isErr()) {
      return result;
    }

    this.telemetryProperties[TelemetryProperty.PreviewAppId] = utils.getLocalTeamsAppId(
      workspaceFolder
    ) as string;

    /* === check ports === */
    const portsInUse = await commonUtils.getPortsInUse(workspaceFolder);
    if (portsInUse.length > 0) {
      return err(errors.PortsAlreadyInUse(portsInUse));
    }

    /* === start services === */
    const programmingLanguage = config?.settings?.programmingLanguage as string;
    if (programmingLanguage === undefined || programmingLanguage.length === 0) {
      return err(errors.MissingProgrammingLanguageSetting());
    }

    result = await this.startServices(
      core,
      workspaceFolder,
      programmingLanguage,
      includeFrontend,
      includeBackend,
      includeBot,
      dotnetChecker,
      funcToolChecker
    );
    if (result.isErr()) {
      return result;
    }

    /* === get local teams app id === */
    // re-activate to make core updated
    coreResult = await activate();
    if (coreResult.isErr()) {
      return err(coreResult.error);
    }
    core = coreResult.value;

    configResult = await core.getProjectConfig(inputs);
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    config = configResult.value;

    const tenantId = this.getLocalDebugTenantId(config);
    const localTeamsAppId = this.getLocalTeamsAppId(config);

    if (localTeamsAppId === undefined || localTeamsAppId.length === 0) {
      return err(errors.TeamsAppIdNotExists());
    }

    /* === open teams web client === */
    result = await this.openTeamsWebClient(
      tenantId.length === 0 ? undefined : tenantId,
      localTeamsAppId,
      browser,
      browserArguments
    );
    if (result.isErr()) {
      return result;
    }

    cliLogger.necessaryLog(LogLevel.Warning, constants.waitCtrlPlusC);

    return ok(null);
  }

  private async spfxPreviewSetup(workspaceFolder: string): Promise<Result<null, FxError>> {
    // init service log writer
    this.serviceLogWriter = new ServiceLogWriter();
    await this.serviceLogWriter.init();

    // run npm install for spfx
    const spfxInstallTask = this.prepareTask(
      TaskDefinition.spfxInstall(workspaceFolder),
      constants.spfxInstallStartMessage
    );

    let result = await spfxInstallTask.task.wait(spfxInstallTask.startCb, spfxInstallTask.stopCb);
    if (result.isErr()) {
      return err(result.error);
    }

    // run gulp trust-dev-cert
    const gulpCertTask = this.prepareTask(
      TaskDefinition.gulpCert(workspaceFolder),
      constants.gulpCertStartMessage
    );

    result = await gulpCertTask.task.wait(gulpCertTask.startCb, gulpCertTask.stopCb);
    if (result.isErr()) {
      return err(result.error);
    }

    // run gulp serve
    const gulpServeTask = this.prepareTask(
      TaskDefinition.gulpServe(workspaceFolder),
      constants.gulpServeStartMessage
    );

    result = await gulpServeTask.task.waitFor(
      constants.gulpServePattern,
      gulpServeTask.startCb,
      gulpServeTask.stopCb,
      this.serviceLogWriter,
      cliLogger
    );
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(null);
  }

  private async openSPFxWebClient(
    browser: constants.Browser,
    url: string,
    browserArguments: string[] = []
  ): Promise<Result<null, FxError>> {
    cliTelemetry.sendTelemetryEvent(
      TelemetryEvent.PreviewSPFxOpenBrowserStart,
      this.telemetryProperties
    );

    const previewBar = CLIUIInstance.createProgressBar(constants.previewSPFxTitle, 1);
    await previewBar.start(constants.previewSPFxStartMessage);
    await previewBar.next(constants.previewSPFxStartMessage);
    const message = [
      {
        content: `preview url: `,
        color: Colors.WHITE,
      },
      {
        content: url,
        color: Colors.BRIGHT_CYAN,
      },
    ];
    cliLogger.necessaryLog(LogLevel.Info, utils.getColorizedString(message));
    try {
      await commonUtils.openBrowser(browser, url, browserArguments);
    } catch {
      const error = errors.OpeningBrowserFailed(browser);
      cliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.PreviewSPFxOpenBrowser,
        error,
        this.telemetryProperties
      );
      cliLogger.necessaryLog(LogLevel.Warning, constants.openBrowserHintMessage);
      cliLogger.necessaryLog(LogLevel.Warning, constants.waitCtrlPlusC);
      await previewBar.end(false);
      return ok(null);
    }
    await previewBar.end(true);

    cliTelemetry.sendTelemetryEvent(TelemetryEvent.PreviewSPFxOpenBrowser, {
      ...this.telemetryProperties,
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });

    cliLogger.necessaryLog(LogLevel.Warning, constants.waitCtrlPlusC);
    return ok(null);
  }

  private async spfxPreview(
    workspaceFolder: string,
    browser: constants.Browser,
    url: string,
    browserArguments: string[] = []
  ): Promise<Result<null, FxError>> {
    {
      const result = await this.spfxPreviewSetup(workspaceFolder);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    {
      const result = await this.openSPFxWebClient(browser, url, browserArguments);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(null);
  }

  private async remotePreview(
    workspaceFolder: string,
    browser: constants.Browser,
    env: string | undefined,
    browserArguments: string[] = []
  ): Promise<Result<null, FxError>> {
    /* === get remote teams app id === */
    const coreResult = await activate(workspaceFolder);
    if (coreResult.isErr()) {
      return err(coreResult.error);
    }
    const core = coreResult.value;

    const inputs: Inputs = {
      projectPath: workspaceFolder,
      platform: Platform.CLI,
      env: env,
    };

    const configResult = await core.getProjectConfig(inputs);
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    const config = configResult.value;

    const activeResourcePlugins = (config?.settings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    const includeSpfx = activeResourcePlugins.some(
      (pluginName) => pluginName === constants.spfxPluginName
    );
    if (includeSpfx) {
      if (!this.sharepointSiteUrl) {
        return err(errors.NoUrlForSPFxRemotePreview());
      }
      const spfxRoot = path.join(workspaceFolder, constants.spfxFolderName);
      return this.spfxPreview(spfxRoot, browser, this.sharepointSiteUrl, browserArguments);
    }

    const tenantId = config?.config
      ?.get(constants.solutionPluginName)
      ?.get(constants.teamsAppTenantIdConfigKey) as string;

    const remoteTeamsAppId: string = isMultiEnvEnabled()
      ? config?.config
          ?.get(constants.appstudioPluginName)
          ?.get(constants.remoteTeamsAppIdConfigKeyNew)
      : config?.config?.get(constants.solutionPluginName)?.get(constants.remoteTeamsAppIdConfigKey);
    if (remoteTeamsAppId === undefined || remoteTeamsAppId.length === 0) {
      return err(errors.PreviewWithoutProvision());
    }

    /* === open teams web client === */
    const result = await this.openTeamsWebClient(
      tenantId.length === 0 ? undefined : tenantId,
      remoteTeamsAppId,
      browser,
      browserArguments
    );
    if (result.isErr()) {
      return result;
    }

    return ok(null);
  }

  private async startNgrok(
    workspaceFolder: string,
    ngrokChecker: NgrokChecker
  ): Promise<Result<null, FxError>> {
    // bot npm install
    const botInstallTask = this.prepareTask(
      TaskDefinition.botInstall(workspaceFolder),
      constants.botInstallStartMessage
    );
    let result = await botInstallTask?.task.wait(botInstallTask?.startCb, botInstallTask?.stopCb);
    if (result.isErr()) {
      return err(errors.PreviewCommandFailed([result.error]));
    }

    // start ngrok
    const ngrokStartTask = this.prepareTask(
      TaskDefinition.ngrokStart(workspaceFolder, false, ngrokChecker.getNgrokBinFolder()),
      constants.ngrokStartStartMessage
    );
    result = await ngrokStartTask.task.waitFor(
      constants.ngrokStartPattern,
      ngrokStartTask.startCb,
      ngrokStartTask.stopCb,
      this.serviceLogWriter
    );
    if (result.isErr()) {
      return err(errors.PreviewCommandFailed([result.error]));
    }
    return ok(null);
  }

  private async prepareDevEnv(
    core: FxCore,
    inputs: Inputs,
    workspaceFolder: string,
    includeFrontend: boolean,
    includeBackend: boolean,
    includeBot: boolean,
    dotnetChecker: DotnetChecker
  ): Promise<Result<null, FxError>> {
    const frontendInstallTask = includeFrontend
      ? this.prepareTask(
          TaskDefinition.frontendInstall(workspaceFolder),
          constants.frontendInstallStartMessage
        )
      : undefined;

    const backendInstallTask = includeBackend
      ? this.prepareTask(
          TaskDefinition.backendInstall(workspaceFolder),
          constants.backendInstallStartMessage
        )
      : undefined;

    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    const backendExtensionsInstallTask = includeBackend
      ? this.prepareTask(
          TaskDefinition.backendExtensionsInstall(workspaceFolder, dotnetExecPath),
          constants.backendExtensionsInstallStartMessage
        )
      : undefined;

    const botInstallTask = includeBot
      ? this.prepareTask(
          TaskDefinition.botInstall(workspaceFolder),
          constants.botInstallStartMessage
        )
      : undefined;

    const results = await Promise.all([
      core.localDebug(inputs),
      frontendInstallTask?.task.wait(frontendInstallTask.startCb, frontendInstallTask.stopCb),
      backendInstallTask?.task.wait(backendInstallTask.startCb, backendInstallTask.stopCb),
      backendExtensionsInstallTask?.task.wait(
        backendExtensionsInstallTask.startCb,
        backendExtensionsInstallTask.stopCb
      ),
      botInstallTask?.task.wait(botInstallTask.startCb, botInstallTask.stopCb),
    ]);
    const fxErrors: FxError[] = [];
    for (const result of results) {
      if (result?.isErr()) {
        fxErrors.push(result.error);
      }
    }
    if (fxErrors.length > 0) {
      return err(errors.PreviewCommandFailed(fxErrors));
    }
    return ok(null);
  }

  private getLocalDebugTenantId(config: ProjectConfig | undefined): string {
    const tenantId = isMultiEnvEnabled()
      ? (config?.localSettings?.teamsApp.get(constants.localSettingsTenantIdConfigKey) as string)
      : (config?.config
          ?.get(constants.solutionPluginName)
          ?.get(constants.teamsAppTenantIdConfigKey) as string);

    return tenantId;
  }

  private getLocalTeamsAppId(config: ProjectConfig | undefined): string {
    const localTeamsAppId = isMultiEnvEnabled()
      ? (config?.localSettings?.teamsApp.get(constants.localSettingsTeamsAppIdConfigKey) as string)
      : (config?.config
          ?.get(constants.solutionPluginName)
          ?.get(constants.localTeamsAppIdConfigKey) as string);

    return localTeamsAppId;
  }

  private async startServices(
    core: FxCore,
    workspaceFolder: string,
    programmingLanguage: string,
    includeFrontend: boolean,
    includeBackend: boolean,
    includeBot: boolean,
    dotnetChecker: DotnetChecker,
    funcToolChecker: FuncToolChecker
  ): Promise<Result<null, FxError>> {
    const localEnv = await commonUtils.getLocalEnv(core, workspaceFolder);

    const frontendStartTask = includeFrontend
      ? this.prepareTask(
          TaskDefinition.frontendStart(workspaceFolder),
          constants.frontendStartStartMessage,
          commonUtils.getFrontendLocalEnv(localEnv)
        )
      : undefined;

    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    const authStartTask = includeFrontend
      ? this.prepareTask(
          TaskDefinition.authStart(dotnetExecPath, commonUtils.getAuthServicePath(localEnv)),
          constants.authStartStartMessage,
          commonUtils.getAuthLocalEnv(localEnv)
        )
      : undefined;

    const funcCommand = await funcToolChecker.getFuncCommand();
    const backendStartTask = includeBackend
      ? this.prepareTask(
          TaskDefinition.backendStart(workspaceFolder, programmingLanguage, funcCommand, false),
          constants.backendStartStartMessage,
          commonUtils.getBackendLocalEnv(localEnv)
        )
      : undefined;
    const backendWatchTask =
      includeBackend && programmingLanguage === constants.ProgrammingLanguage.typescript
        ? this.prepareTask(
            TaskDefinition.backendWatch(workspaceFolder),
            constants.backendWatchStartMessage,
            commonUtils.getBackendLocalEnv(localEnv)
          )
        : undefined;

    const botStartTask = includeBot
      ? this.prepareTask(
          TaskDefinition.botStart(workspaceFolder, programmingLanguage, false),
          constants.botStartStartMessage,
          commonUtils.getBotLocalEnv(localEnv)
        )
      : undefined;

    const results = await Promise.all([
      frontendStartTask?.task.waitFor(
        constants.frontendStartPattern,
        frontendStartTask.startCb,
        frontendStartTask.stopCb,
        this.serviceLogWriter
      ),
      authStartTask?.task.waitFor(
        constants.authStartPattern,
        authStartTask.startCb,
        authStartTask.stopCb,
        this.serviceLogWriter
      ),
      backendStartTask?.task.waitFor(
        constants.backendStartPattern,
        backendStartTask.startCb,
        backendStartTask.stopCb,
        this.serviceLogWriter
      ),
      backendWatchTask?.task.waitFor(
        constants.backendWatchPattern,
        backendWatchTask.startCb,
        backendWatchTask.stopCb,
        this.serviceLogWriter
      ),
      await botStartTask?.task.waitFor(
        constants.botStartPattern,
        botStartTask.startCb,
        botStartTask.stopCb,
        this.serviceLogWriter
      ),
    ]);
    const fxErrors: FxError[] = [];
    for (const result of results) {
      if (result?.isErr()) {
        fxErrors.push(result.error);
      }
    }
    if (fxErrors.length > 0) {
      return err(errors.PreviewCommandFailed(fxErrors));
    }
    return ok(null);
  }

  private async openTeamsWebClient(
    tenantIdFromConfig: string | undefined,
    teamsAppId: string,
    browser: constants.Browser,
    browserArguments: string[] = []
  ): Promise<Result<null, FxError>> {
    cliTelemetry.sendTelemetryEvent(
      TelemetryEvent.PreviewSideloadingStart,
      this.telemetryProperties
    );

    let sideloadingUrl = constants.sideloadingUrl.replace(
      constants.teamsAppIdPlaceholder,
      teamsAppId
    );

    let tenantId, loginHint: string | undefined;
    try {
      const tokenObject = (await AppStudioTokenInstance.getStatus())?.accountInfo;
      if (tokenObject) {
        // user signed in
        tenantId = tokenObject.tid as string;
        loginHint = tokenObject.upn as string;
      } else {
        // no signed user
        tenantId = tenantIdFromConfig;
        loginHint = "login_your_m365_account"; // a workaround that user has the chance to login
      }
    } catch {
      // ignore error
    }

    if (tenantId && loginHint) {
      sideloadingUrl = sideloadingUrl.replace(
        constants.accountHintPlaceholder,
        `appTenantId=${tenantId}&login_hint=${loginHint}`
      );
    } else {
      sideloadingUrl = sideloadingUrl.replace(constants.accountHintPlaceholder, "");
    }

    const previewBar = CLIUIInstance.createProgressBar(constants.previewTitle, 1);
    await previewBar.start(constants.previewStartMessage);
    await previewBar.next(constants.previewStartMessage);
    const message = [
      {
        content: `preview url: `,
        color: Colors.WHITE,
      },
      {
        content: sideloadingUrl,
        color: Colors.BRIGHT_CYAN,
      },
    ];
    cliLogger.necessaryLog(LogLevel.Info, utils.getColorizedString(message));
    try {
      await commonUtils.openBrowser(browser, sideloadingUrl, browserArguments);
    } catch {
      const error = errors.OpeningBrowserFailed(browser);
      cliTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.PreviewSideloading,
        error,
        this.telemetryProperties
      );
      cliLogger.necessaryLog(LogLevel.Warning, constants.openBrowserHintMessage);
      await previewBar.end(false);
      return ok(null);
    }
    await previewBar.end(true);

    cliTelemetry.sendTelemetryEvent(TelemetryEvent.PreviewSideloading, {
      ...this.telemetryProperties,
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(null);
  }

  private async terminateTasks(): Promise<void> {
    for (const task of this.backgroundTasks) {
      await task.terminate();
    }
    this.backgroundTasks = [];
  }

  private async handleDependences(
    hasBackend: boolean,
    hasBot: boolean,
    skipNgrok: boolean
  ): Promise<Result<[FuncToolChecker, DotnetChecker, NgrokChecker], FxError>> {
    const cliAdapter = new CLIAdapter(hasBackend, hasBot, !skipNgrok, cliEnvCheckerTelemetry);
    const nodeChecker = new AzureNodeChecker(
      cliAdapter,
      cliEnvCheckerLogger,
      cliEnvCheckerTelemetry
    );
    const dotnetChecker = new DotnetChecker(
      cliAdapter,
      cliEnvCheckerLogger,
      cliEnvCheckerTelemetry
    );
    const funcChecker = new FuncToolChecker(
      cliAdapter,
      cliEnvCheckerLogger,
      cliEnvCheckerTelemetry
    );
    const depsChecker = new DepsChecker(cliEnvCheckerLogger, cliAdapter, [
      nodeChecker,
      dotnetChecker,
      funcChecker,
    ]);

    // TODO: integrate into DepsChecker after all checkers support linux
    const ngrokChecker = new NgrokChecker(cliAdapter, cliEnvCheckerLogger, cliEnvCheckerTelemetry);

    const shouldContinue = (await depsChecker.resolve()) && ngrokChecker.resolve();
    if (!shouldContinue) {
      return err(errors.DependencyCheckerFailed());
    }

    return ok([funcChecker, dotnetChecker, ngrokChecker]);
  }

  private prepareTask(
    taskDefinition: ITaskDefinition,
    startMessage: string,
    env?: { [key: string]: string }
  ): {
    task: Task;
    startCb: (taskTitle: string, background: boolean) => Promise<void>;
    stopCb: (
      taskTitle: string,
      background: boolean,
      result: TaskResult,
      serviceLogWriter?: ServiceLogWriter
    ) => Promise<FxError | null>;
  } {
    const taskEnv = env ?? taskDefinition.env;
    const task = new Task(
      taskDefinition.name,
      taskDefinition.isBackground,
      taskDefinition.command,
      taskDefinition.args,
      {
        shell: taskDefinition.execOptions.needCmd
          ? "cmd.exe"
          : taskDefinition.execOptions.needShell,
        cwd: taskDefinition.cwd,
        env: taskEnv ? commonUtils.mergeProcessEnv(taskEnv) : undefined,
      }
    );
    const bar = CLIUIInstance.createProgressBar(taskDefinition.name, 1);
    const startCb = commonUtils.createTaskStartCb(bar, startMessage, this.telemetryProperties);
    const stopCb = commonUtils.createTaskStopCb(bar, this.telemetryProperties);
    if (taskDefinition.isBackground) {
      this.backgroundTasks.push(task);
    }
    return { task: task, startCb: startCb, stopCb: stopCb };
  }
}
