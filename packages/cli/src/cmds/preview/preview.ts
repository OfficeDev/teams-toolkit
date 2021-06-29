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
import { CliTelemetry } from "../../telemetry/cliTelemetry";
import cliLogger from "../../commonlib/log";
import * as errors from "./errors";
import activate from "../../activate";
import { Task } from "./task";
import DialogManagerInstance from "../../userInterface";
import AppStudioTokenInstance from "../../commonlib/appStudioLogin";

export default class Preview extends YargsCommand {
  public readonly commandHead = `preview`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Preview the current application.";

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
    if (args.local && args.remote) {
      return err(errors.ExclusiveLocalRemoteOptions());
    }

    const workspaceFolder = path.resolve(args.folder as string);
    if (!utils.isWorkspaceSupported(workspaceFolder)) {
      return err(errors.WorkspaceNotSupported(workspaceFolder));
    }

    CliTelemetry.setReporter(CliTelemetry.getReporter().withRootFolder(workspaceFolder));

    if (args.local || (!args.local && !args.remote)) {
      return await this.localPreview(workspaceFolder);
    }
    return await this.remotePreview(workspaceFolder);
  }

  private async localPreview(workspaceFolder: string): Promise<Result<null, FxError>> {
    // TODO: check dependencies

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
      includeBot && skipNgrok ? botRoot : undefined
    );
    if (result.isErr()) {
      return result;
    }

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
      includeBot ? botRoot : undefined
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

    cliLogger.necessaryLog(LogLevel.Info, constants.waitCtrlPlusC);

    return ok(null);
  }

  private async remotePreview(workspaceFolder: string): Promise<Result<null, FxError>> {
    // TODO: get remote teams app id

    // TODO: open teams web client

    return ok(null);
  }

  private async startNgrok(botRoot: string): Promise<Result<null, FxError>> {
    // bot npm install
    const botInstallTask = new Task(constants.npmInstallCommand, {
      cwd: botRoot,
    });
    const botInstallBar = DialogManagerInstance.createProgressBar(constants.botInstallTitle, 1);
    const botInstallStartCb = commonUtils.createTaskStartCb(
      botInstallBar,
      constants.botInstallStartMessage
    );
    const botInstallStopCb = commonUtils.createTaskStopCb(
      constants.botInstallTitle,
      botInstallBar,
      constants.botInstallSuccessMessage,
      false
    );
    let result = await botInstallTask.wait(botInstallStartCb, botInstallStopCb);
    if (result.isErr()) {
      return err(result.error);
    }

    // start ngrok
    const ngrokStartTask = new Task(constants.ngrokStartCommand, {
      cwd: botRoot,
    });
    const ngrokStartBar = DialogManagerInstance.createProgressBar(constants.ngrokStartTitle, 1);
    const ngrokStartStartCb = commonUtils.createTaskStartCb(
      ngrokStartBar,
      constants.ngrokStartStartMessage
    );
    const ngrokStartStopCb = commonUtils.createTaskStopCb(
      constants.ngrokStartTitle,
      ngrokStartBar,
      constants.ngrokStartSuccessMessage,
      true
    );
    result = await ngrokStartTask.waitFor(
      constants.ngrokStartPattern,
      ngrokStartStartCb,
      ngrokStartStopCb
    );
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(null);
  }

  private async prepareDevEnv(
    core: FxCore,
    inputs: Inputs,
    frontendRoot: string | undefined,
    backendRoot: string | undefined,
    botRoot: string | undefined
  ): Promise<Result<null, FxError>> {
    let frontendInstallTask: Task | undefined;
    if (frontendRoot !== undefined) {
      frontendInstallTask = new Task(constants.npmInstallCommand, {
        cwd: frontendRoot,
      });
    }

    let backendInstallTask: Task | undefined;
    let backendExtensionsInstallTask: Task | undefined;
    if (backendRoot !== undefined) {
      backendInstallTask = new Task(constants.npmInstallCommand, {
        cwd: backendRoot,
      });
      backendExtensionsInstallTask = new Task(constants.backendExtensionsInstallCommand, {
        cwd: backendRoot,
      });
    }

    let botInstallTask: Task | undefined;
    if (botRoot !== undefined) {
      botInstallTask = new Task(constants.npmInstallCommand, {
        cwd: botRoot,
      });
    }

    const frontendInstallBar = DialogManagerInstance.createProgressBar(
      constants.frontendInstallTitle,
      1
    );
    const frontendInstallStartCb = commonUtils.createTaskStartCb(
      frontendInstallBar,
      constants.frontendInstallStartMessage
    );
    const frontendInstallStopCb = commonUtils.createTaskStopCb(
      constants.frontendInstallTitle,
      frontendInstallBar,
      constants.frontendInstallSuccessMessage,
      false
    );

    const backendInstallBar = DialogManagerInstance.createProgressBar(
      constants.backendInstallTitle,
      1
    );
    const backendInstallStartCb = commonUtils.createTaskStartCb(
      backendInstallBar,
      constants.backendInstallStartMessage
    );
    const backendInstallStopCb = commonUtils.createTaskStopCb(
      constants.backendInstallTitle,
      backendInstallBar,
      constants.backendInstallSuccessMessage,
      false
    );

    const backendExtensionsInstallBar = DialogManagerInstance.createProgressBar(
      constants.backendExtensionsInstallTitle,
      1
    );
    const backendExtensionsInstallStartCb = commonUtils.createTaskStartCb(
      backendExtensionsInstallBar,
      constants.backendExtensionsInstallStartMessage
    );
    const backendExtensionsInstallStopCb = commonUtils.createTaskStopCb(
      constants.backendExtensionsInstallTitle,
      backendExtensionsInstallBar,
      constants.backendExtensionsInstallSuccessMessage,
      false
    );

    const botInstallBar = DialogManagerInstance.createProgressBar(constants.botInstallTitle, 1);
    const botInstallStartCb = commonUtils.createTaskStartCb(
      botInstallBar,
      constants.botInstallStartMessage
    );
    const botInstallStopCb = commonUtils.createTaskStopCb(
      constants.botInstallTitle,
      botInstallBar,
      constants.botInstallSuccessMessage,
      false
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
    botRoot: string | undefined
  ): Promise<Result<null, FxError>> {
    let frontendStartTask: Task | undefined;
    if (frontendRoot !== undefined) {
      const env = await commonUtils.getFrontendLocalEnv(workspaceFolder);
      frontendStartTask = new Task(constants.frontendStartCommand, {
        cwd: frontendRoot,
        env: commonUtils.mergeProcessEnv(env),
      });
    }

    let authStartTask: Task | undefined;
    if (frontendRoot !== undefined) {
      const cwd = await commonUtils.getAuthServicePath(workspaceFolder);
      const env = await commonUtils.getAuthLocalEnv(workspaceFolder);
      authStartTask = new Task(constants.authStartCommand, {
        cwd,
        env: commonUtils.mergeProcessEnv(env),
      });
    }

    let backendStartTask: Task | undefined;
    let backendWatchTask: Task | undefined;
    if (backendRoot !== undefined) {
      const env = await commonUtils.getBackendLocalEnv(workspaceFolder);
      const mergedEnv = commonUtils.mergeProcessEnv(env);
      const command =
        programmingLanguage === constants.ProgrammingLanguage.typescript
          ? constants.backendStartTsCommand
          : constants.backendStartJsCommand;
      backendStartTask = new Task(command, {
        cwd: backendRoot,
        env: mergedEnv,
      });
      if (programmingLanguage === constants.ProgrammingLanguage.typescript) {
        backendWatchTask = new Task(constants.backendWatchCommand, {
          cwd: backendRoot,
          env: mergedEnv,
        });
      }
    }

    let botStartTask: Task | undefined;
    if (botRoot !== undefined) {
      const command =
        programmingLanguage === constants.ProgrammingLanguage.typescript
          ? constants.botStartTsCommand
          : constants.botStartJsCommand;
      const env = await commonUtils.getBotLocalEnv(workspaceFolder);
      botStartTask = new Task(command, {
        cwd: botRoot,
        env: commonUtils.mergeProcessEnv(env),
      });
    }

    const frontendStartBar = DialogManagerInstance.createProgressBar(
      constants.frontendStartTitle,
      1
    );
    const frontendStartStartCb = commonUtils.createTaskStartCb(
      frontendStartBar,
      constants.frontendStartStartMessage
    );
    const frontendStartStopCb = commonUtils.createTaskStopCb(
      constants.frontendStartTitle,
      frontendStartBar,
      constants.frontendStartSuccessMessage,
      true
    );

    const authStartBar = DialogManagerInstance.createProgressBar(constants.authStartTitle, 1);
    const authStartStartCb = commonUtils.createTaskStartCb(
      authStartBar,
      constants.authStartStartMessage
    );
    const authStartStopCb = commonUtils.createTaskStopCb(
      constants.authStartTitle,
      authStartBar,
      constants.authStartSuccessMessage,
      true
    );

    const backendStartBar = DialogManagerInstance.createProgressBar(constants.backendStartTitle, 1);
    const backendStartStartCb = commonUtils.createTaskStartCb(
      backendStartBar,
      constants.backendStartStartMessage
    );
    const backendStartStopCb = commonUtils.createTaskStopCb(
      constants.backendStartTitle,
      backendStartBar,
      constants.backendStartSuccessMessage,
      true
    );

    const backendWatchBar = DialogManagerInstance.createProgressBar(constants.backendWatchTitle, 1);
    const backendWatchStartCb = commonUtils.createTaskStartCb(
      backendWatchBar,
      constants.backendWatchStartMessage
    );
    const backendWatchStopCb = commonUtils.createTaskStopCb(
      constants.backendWatchTitle,
      backendWatchBar,
      constants.backendWatchSuccessMessage,
      true
    );

    const botStartBar = DialogManagerInstance.createProgressBar(constants.botStartTitle, 1);
    const botStartStartCb = commonUtils.createTaskStartCb(
      botStartBar,
      constants.botStartStartMessage
    );
    const botStartStopCb = commonUtils.createTaskStopCb(
      constants.botStartTitle,
      botStartBar,
      constants.botStartSuccessMessage,
      true
    );

    const results = await Promise.all([
      frontendStartTask?.waitFor(
        constants.frontendStartPattern,
        frontendStartStartCb,
        frontendStartStopCb
      ),
      authStartTask?.waitFor(constants.authStartPattern, authStartStartCb, authStartStopCb),
      backendStartTask?.waitFor(
        constants.backendStartPattern,
        backendStartStartCb,
        backendStartStopCb
      ),
      backendWatchTask?.waitFor(
        constants.backendWatchPattern,
        backendWatchStartCb,
        backendWatchStopCb
      ),
      await botStartTask?.waitFor(constants.botStartPattern, botStartStartCb, botStartStopCb),
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

    const sideloadingBar = DialogManagerInstance.createProgressBar(constants.sideloadingTitle, 1);
    await sideloadingBar.start(`${constants.sideloadingStartMessage}`);
    const message = [
      {
        content: `sideloading url: `,
        color: Colors.WHITE,
      },
      {
        content: sideloadingUrl,
        color: Colors.BRIGHT_CYAN,
      },
    ];
    cliLogger.necessaryLog(LogLevel.Info, utils.getColorizedString(message));
    await open(sideloadingUrl);
    await sideloadingBar.next(constants.sideloadingSuccessMessage);
    await sideloadingBar.end();

    return ok(null);
  }
}
