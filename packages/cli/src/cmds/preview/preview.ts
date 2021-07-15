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
  Result,
} from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import open from "open";

import { YargsCommand } from "../../yargsCommand";
import * as utils from "../../utils";
import * as commonUtils from "./commonUtils";
import * as constants from "./constants";
import cliLogger from "../../commonlib/log";
import * as errors from "./errors";
import activate from "../../activate";
import { Task } from "./task";
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
import { isWindows } from "./depsChecker/common";

export default class Preview extends YargsCommand {
  public readonly commandHead = `preview`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Preview the current application.";

  private backgroundTasks: Task[] = [];
  private readonly telemetryProperties: { [key: string]: string } = {};
  private serviceLogWriter: ServiceLogWriter | undefined;

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

      if (args.local && args.remote) {
        throw errors.ExclusiveLocalRemoteOptions();
      }
      if (!utils.isWorkspaceSupported(workspaceFolder)) {
        throw errors.WorkspaceNotSupported(workspaceFolder);
      }

      const result =
        previewType === "local"
          ? await this.localPreview(workspaceFolder)
          : await this.remotePreview(workspaceFolder);
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

  private async localPreview(workspaceFolder: string): Promise<Result<null, FxError>> {
    let coreResult = await activate();
    if (coreResult.isErr()) {
      return err(coreResult.error);
    }
    let core = coreResult.value;

    const inputs: Inputs = {
      projectPath: workspaceFolder,
      platform: Platform.CLI,
    };

    let configResult = await core.getProjectConfig(inputs);
    if (configResult.isErr()) {
      return err(configResult.error);
    }
    let config = configResult.value;

    const activeResourcePlugins = (config?.settings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    const includeFrontend = activeResourcePlugins.some(
      (pluginName) => pluginName === constants.frontendHostingPluginName
    );
    const includeBackend = activeResourcePlugins.some(
      (pluginName) => pluginName === constants.functionPluginName
    );
    const includeBot = activeResourcePlugins.some(
      (pluginName) => pluginName === constants.botPluginName
    );
    const includeSpfx = activeResourcePlugins.some(
      (pluginName) => pluginName === constants.spfxPluginName
    );
    // TODO: remove when SPFx preview is ready
    if (includeSpfx) {
      return err(errors.SPFxNotSupported());
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

    const [funcToolChecker, dotnetChecker] = await this.handleDependences(includeBackend);

    // clear background tasks
    this.backgroundTasks = [];
    // init service log writer
    this.serviceLogWriter = new ServiceLogWriter();
    await this.serviceLogWriter.init();

    /* === start ngrok === */
    const skipNgrokConfig = config?.config
      ?.get(constants.localDebugPluginName)
      ?.get(constants.skipNgrokConfigKey) as string;
    const skipNgrok = skipNgrokConfig !== undefined && skipNgrokConfig.trim() === "true";
    if (includeBot && !skipNgrok) {
      const result = await this.startNgrok(botRoot);
      if (result.isErr()) {
        return result;
      }
    }

    /* === prepare dev env === */
    let result = await this.prepareDevEnv(
      core,
      inputs,
      includeFrontend ? frontendRoot : undefined,
      includeBackend ? backendRoot : undefined,
      includeBot && skipNgrok ? botRoot : undefined,
      dotnetChecker
    );
    if (result.isErr()) {
      return result;
    }

    this.telemetryProperties[TelemetryProperty.PreviewAppId] = utils.getLocalTeamsAppId(
      workspaceFolder
    ) as string;

    /* === check ports === */
    const portsInUse = await commonUtils.getPortsInUse(includeFrontend, includeBackend, includeBot);
    if (portsInUse.length > 0) {
      return err(errors.PortsAlreadyInUse(portsInUse));
    }

    /* === start services === */
    const programmingLanguage = config?.config
      ?.get(constants.solutionPluginName)
      ?.get(constants.programmingLanguageConfigKey) as string;
    result = await this.startServices(
      workspaceFolder,
      programmingLanguage,
      includeFrontend ? frontendRoot : undefined,
      includeBackend ? backendRoot : undefined,
      includeBot ? botRoot : undefined,
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

    const tenantId = config?.config
      ?.get(constants.solutionPluginName)
      ?.get(constants.teamsAppTenantIdConfigKey) as string;
    const localTeamsAppId = config?.config
      ?.get(constants.solutionPluginName)
      ?.get(constants.localTeamsAppIdConfigKey) as string;
    if (localTeamsAppId === undefined || localTeamsAppId.length === 0) {
      return err(errors.TeamsAppIdNotExists());
    }

    /* === open teams web client === */
    await this.openTeamsWebClient(tenantId.length === 0 ? undefined : tenantId, localTeamsAppId);

    cliLogger.necessaryLog(LogLevel.Warning, constants.waitCtrlPlusC);

    return ok(null);
  }

  private async remotePreview(workspaceFolder: string): Promise<Result<null, FxError>> {
    /* === get remote teams app id === */
    const coreResult = await activate();
    if (coreResult.isErr()) {
      return err(coreResult.error);
    }
    const core = coreResult.value;

    const inputs: Inputs = {
      projectPath: workspaceFolder,
      platform: Platform.CLI,
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
    // TODO: remove when SPFx preview is ready
    if (includeSpfx) {
      return err(errors.SPFxNotSupported());
    }

    const tenantId = config?.config
      ?.get(constants.solutionPluginName)
      ?.get(constants.teamsAppTenantIdConfigKey) as string;
    const remoteTeamsAppId = config?.config
      ?.get(constants.solutionPluginName)
      ?.get(constants.remoteTeamsAppIdConfigKey) as string;
    if (remoteTeamsAppId === undefined || remoteTeamsAppId.length === 0) {
      return err(errors.PreviewWithoutProvision());
    }

    /* === open teams web client === */
    await this.openTeamsWebClient(tenantId.length === 0 ? undefined : tenantId, remoteTeamsAppId);

    return ok(null);
  }

  private async startNgrok(botRoot: string): Promise<Result<null, FxError>> {
    // bot npm install
    const botInstallTask = new Task(
      constants.botInstallTitle,
      false,
      constants.npmInstallCommand,
      undefined,
      {
        shell: true,
        cwd: botRoot,
      }
    );
    const botInstallBar = CLIUIInstance.createProgressBar(constants.botInstallTitle, 1);
    const botInstallStartCb = commonUtils.createTaskStartCb(
      botInstallBar,
      constants.botInstallStartMessage,
      this.telemetryProperties
    );
    const botInstallStopCb = commonUtils.createTaskStopCb(
      botInstallBar,
      constants.botInstallSuccessMessage,
      this.telemetryProperties
    );
    let result = await botInstallTask.wait(botInstallStartCb, botInstallStopCb);
    if (result.isErr()) {
      return err(errors.PreviewCommandFailed([result.error]));
    }

    // start ngrok
    const ngrokStartTask = new Task(
      constants.ngrokStartTitle,
      true,
      constants.ngrokStartCommand,
      undefined,
      {
        shell: true,
        cwd: botRoot,
      }
    );
    this.backgroundTasks.push(ngrokStartTask);
    const ngrokStartBar = CLIUIInstance.createProgressBar(constants.ngrokStartTitle, 1);
    const ngrokStartStartCb = commonUtils.createTaskStartCb(
      ngrokStartBar,
      constants.ngrokStartStartMessage,
      this.telemetryProperties
    );
    const ngrokStartStopCb = commonUtils.createTaskStopCb(
      ngrokStartBar,
      constants.ngrokStartSuccessMessage,
      this.telemetryProperties
    );
    result = await ngrokStartTask.waitFor(
      constants.ngrokStartPattern,
      ngrokStartStartCb,
      ngrokStartStopCb,
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
    frontendRoot: string | undefined,
    backendRoot: string | undefined,
    botRoot: string | undefined,
    dotnetChecker: DotnetChecker
  ): Promise<Result<null, FxError>> {
    let frontendInstallTask: Task | undefined;
    if (frontendRoot !== undefined) {
      frontendInstallTask = new Task(
        constants.frontendInstallTitle,
        false,
        constants.npmInstallCommand,
        undefined,
        {
          shell: true,
          cwd: frontendRoot,
        }
      );
    }

    // TODO: dependency checker
    let backendInstallTask: Task | undefined;
    let backendExtensionsInstallTask: Task | undefined;
    if (backendRoot !== undefined) {
      backendInstallTask = new Task(
        constants.backendInstallTitle,
        false,
        constants.npmInstallCommand,
        undefined,
        {
          shell: true,
          cwd: backendRoot,
        }
      );
      backendExtensionsInstallTask = new Task(
        constants.backendExtensionsInstallTitle,
        false,
        // env checker: use dotnet execPath
        constants.backendExtensionsInstallCommand.replace(
          "@execPath",
          await dotnetChecker.getDotnetExecPath()
        ),
        undefined,
        {
          shell: true, // TODO: should false
          cwd: backendRoot,
        }
      );
    }

    let botInstallTask: Task | undefined;
    if (botRoot !== undefined) {
      botInstallTask = new Task(
        constants.botInstallTitle,
        false,
        constants.npmInstallCommand,
        undefined,
        {
          shell: true,
          cwd: botRoot,
        }
      );
    }

    const frontendInstallBar = CLIUIInstance.createProgressBar(constants.frontendInstallTitle, 1);
    const frontendInstallStartCb = commonUtils.createTaskStartCb(
      frontendInstallBar,
      constants.frontendInstallStartMessage,
      this.telemetryProperties
    );
    const frontendInstallStopCb = commonUtils.createTaskStopCb(
      frontendInstallBar,
      constants.frontendInstallSuccessMessage,
      this.telemetryProperties
    );

    const backendInstallBar = CLIUIInstance.createProgressBar(constants.backendInstallTitle, 1);
    const backendInstallStartCb = commonUtils.createTaskStartCb(
      backendInstallBar,
      constants.backendInstallStartMessage,
      this.telemetryProperties
    );
    const backendInstallStopCb = commonUtils.createTaskStopCb(
      backendInstallBar,
      constants.backendInstallSuccessMessage,
      this.telemetryProperties
    );

    const backendExtensionsInstallBar = CLIUIInstance.createProgressBar(
      constants.backendExtensionsInstallTitle,
      1
    );
    const backendExtensionsInstallStartCb = commonUtils.createTaskStartCb(
      backendExtensionsInstallBar,
      constants.backendExtensionsInstallStartMessage
    );
    const backendExtensionsInstallStopCb = commonUtils.createTaskStopCb(
      backendExtensionsInstallBar,
      constants.backendExtensionsInstallSuccessMessage
    );

    const botInstallBar = CLIUIInstance.createProgressBar(constants.botInstallTitle, 1);
    const botInstallStartCb = commonUtils.createTaskStartCb(
      botInstallBar,
      constants.botInstallStartMessage,
      this.telemetryProperties
    );
    const botInstallStopCb = commonUtils.createTaskStopCb(
      botInstallBar,
      constants.botInstallSuccessMessage,
      this.telemetryProperties
    );

    const results = await Promise.all([
      core.localDebug(inputs),
      frontendInstallTask?.wait(frontendInstallStartCb, frontendInstallStopCb),
      backendInstallTask?.wait(backendInstallStartCb, backendInstallStopCb),
      backendExtensionsInstallTask?.wait(
        backendExtensionsInstallStartCb,
        backendExtensionsInstallStopCb
      ),
      botInstallTask?.wait(botInstallStartCb, botInstallStopCb),
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

  private async startServices(
    workspaceFolder: string,
    programmingLanguage: string,
    frontendRoot: string | undefined,
    backendRoot: string | undefined,
    botRoot: string | undefined,
    dotnetChecker: DotnetChecker,
    funcToolChecker: FuncToolChecker
  ): Promise<Result<null, FxError>> {
    let frontendStartTask: Task | undefined;
    if (frontendRoot !== undefined) {
      const env = await commonUtils.getFrontendLocalEnv(workspaceFolder);
      frontendStartTask = new Task(
        constants.frontendStartTitle,
        true,
        constants.frontendStartCommand,
        undefined,
        {
          shell: true,
          cwd: frontendRoot,
          env: commonUtils.mergeProcessEnv(env),
        }
      );
      this.backgroundTasks.push(frontendStartTask);
    }

    // TODO: dependency checker
    let authStartTask: Task | undefined;
    if (frontendRoot !== undefined) {
      const cwd = await commonUtils.getAuthServicePath(workspaceFolder);
      const env = await commonUtils.getAuthLocalEnv(workspaceFolder);
      authStartTask = new Task(
        constants.authStartTitle,
        true,
        // env checker: use dotnet execPath
        constants.authStartCommand.replace("@execPath", await dotnetChecker.getDotnetExecPath()),
        undefined,
        {
          shell: true,
          cwd,
          env: commonUtils.mergeProcessEnv(env),
        }
      );
      this.backgroundTasks.push(authStartTask);
    }

    // TODO: dependency checker
    let backendStartTask: Task | undefined;
    let backendWatchTask: Task | undefined;
    if (backendRoot !== undefined) {
      const env = await commonUtils.getBackendLocalEnv(workspaceFolder);
      const mergedEnv = commonUtils.mergeProcessEnv(env);
      const command =
        programmingLanguage === constants.ProgrammingLanguage.typescript
          ? // env checker: use func command
            constants.backendStartTsCommand.replace(
              "@command",
              await funcToolChecker.getFuncCommand()
            )
          : constants.backendStartJsCommand.replace(
              "@command",
              await funcToolChecker.getFuncCommand()
            );

      backendStartTask = new Task(constants.backendStartTitle, true, command, undefined, {
        shell: isWindows() ? "cmd.exe" : true,
        cwd: backendRoot,
        env: mergedEnv,
      });
      this.backgroundTasks.push(backendStartTask);
      if (programmingLanguage === constants.ProgrammingLanguage.typescript) {
        backendWatchTask = new Task(
          constants.backendWatchTitle,
          true,
          constants.backendWatchCommand,
          undefined,
          {
            shell: true,
            cwd: backendRoot,
            env: mergedEnv,
          }
        );
        this.backgroundTasks.push(backendWatchTask);
      }
    }

    let botStartTask: Task | undefined;
    if (botRoot !== undefined) {
      const command =
        programmingLanguage === constants.ProgrammingLanguage.typescript
          ? constants.botStartTsCommand
          : constants.botStartJsCommand;
      const env = await commonUtils.getBotLocalEnv(workspaceFolder);
      botStartTask = new Task(constants.botStartTitle, true, command, undefined, {
        shell: true,
        cwd: botRoot,
        env: commonUtils.mergeProcessEnv(env),
      });
      this.backgroundTasks.push(botStartTask);
    }

    const frontendStartBar = CLIUIInstance.createProgressBar(constants.frontendStartTitle, 1);
    const frontendStartStartCb = commonUtils.createTaskStartCb(
      frontendStartBar,
      constants.frontendStartStartMessage,
      this.telemetryProperties
    );
    const frontendStartStopCb = commonUtils.createTaskStopCb(
      frontendStartBar,
      constants.frontendStartSuccessMessage,
      this.telemetryProperties
    );

    const authStartBar = CLIUIInstance.createProgressBar(constants.authStartTitle, 1);
    const authStartStartCb = commonUtils.createTaskStartCb(
      authStartBar,
      constants.authStartStartMessage,
      this.telemetryProperties
    );
    const authStartStopCb = commonUtils.createTaskStopCb(
      authStartBar,
      constants.authStartSuccessMessage,
      this.telemetryProperties
    );

    const backendStartBar = CLIUIInstance.createProgressBar(constants.backendStartTitle, 1);
    const backendStartStartCb = commonUtils.createTaskStartCb(
      backendStartBar,
      constants.backendStartStartMessage,
      this.telemetryProperties
    );
    const backendStartStopCb = commonUtils.createTaskStopCb(
      backendStartBar,
      constants.backendStartSuccessMessage,
      this.telemetryProperties
    );

    const backendWatchBar = CLIUIInstance.createProgressBar(constants.backendWatchTitle, 1);
    const backendWatchStartCb = commonUtils.createTaskStartCb(
      backendWatchBar,
      constants.backendWatchStartMessage,
      this.telemetryProperties
    );
    const backendWatchStopCb = commonUtils.createTaskStopCb(
      backendWatchBar,
      constants.backendWatchSuccessMessage,
      this.telemetryProperties
    );

    const botStartBar = CLIUIInstance.createProgressBar(constants.botStartTitle, 1);
    const botStartStartCb = commonUtils.createTaskStartCb(
      botStartBar,
      constants.botStartStartMessage,
      this.telemetryProperties
    );
    const botStartStopCb = commonUtils.createTaskStopCb(
      botStartBar,
      constants.botStartSuccessMessage,
      this.telemetryProperties
    );

    const results = await Promise.all([
      frontendStartTask?.waitFor(
        constants.frontendStartPattern,
        frontendStartStartCb,
        frontendStartStopCb,
        this.serviceLogWriter
      ),
      authStartTask?.waitFor(
        constants.authStartPattern,
        authStartStartCb,
        authStartStopCb,
        this.serviceLogWriter
      ),
      backendStartTask?.waitFor(
        constants.backendStartPattern,
        backendStartStartCb,
        backendStartStopCb,
        this.serviceLogWriter
      ),
      backendWatchTask?.waitFor(
        constants.backendWatchPattern,
        backendWatchStartCb,
        backendWatchStopCb,
        this.serviceLogWriter
      ),
      await botStartTask?.waitFor(
        constants.botStartPattern,
        botStartStartCb,
        botStartStopCb,
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
    teamsAppId: string
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
    await previewBar.start(`${constants.previewStartMessage}`);
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
    await open(sideloadingUrl);
    await previewBar.next(constants.previewSuccessMessage);
    await previewBar.end();

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

  private async handleDependences(hasBackend: boolean): Promise<[FuncToolChecker, DotnetChecker]> {
    const cliAdapter = new CLIAdapter(cliEnvCheckerTelemetry, hasBackend);
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

    const shouldContinue = await depsChecker.resolve();
    if (!shouldContinue) {
      throw new Error("preview stopped.");
    }

    return [funcChecker, dotnetChecker];
  }
}
