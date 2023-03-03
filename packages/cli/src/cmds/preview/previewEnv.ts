// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import * as util from "util";
import { Argv } from "yargs";
import {
  assembleError,
  Colors,
  err,
  FxError,
  LogLevel,
  ok,
  Result,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import { TelemetryContext } from "@microsoft/teamsfx-core/build/common/local/localTelemetryReporter";
import { loadTeamsFxDevScript } from "@microsoft/teamsfx-core/build/common/local/packageJsonHelper";
import { AppStudioScopes, getSideloadingStatus } from "@microsoft/teamsfx-core/build/common/tools";
import { envUtil } from "@microsoft/teamsfx-core/build/component/utils/envUtil";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import * as commonUtils from "./commonUtils";
import * as constants from "./constants";
import * as errors from "./errors";
import { openHubWebClient } from "./launch";
import { localTelemetryReporter } from "./localTelemetryReporter";
import { ServiceLogWriter } from "./serviceLogWriter";
import { Task } from "./task";
import { showInstallAppInTeamsMessage, getTeamsAppInternalId } from "./teamsAppInstallation";
import { signedOut } from "../../commonlib/common/constant";
import cliLogger from "../../commonlib/log";
import M365TokenInstance from "../../commonlib/m365Login";
import { cliSource, RootFolderOptions } from "../../constants";
import cliTelemetry from "../../telemetry/cliTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import CLIUIInstance from "../../userInteraction";
import { getColorizedString, isWorkspaceSupported } from "../../utils";
import { YargsCommand } from "../../yargsCommand";

enum Progress {
  M365Account = "Microsoft 365 Account",
}

const ProgressMessage: { [key: string]: string } = Object.freeze({
  [Progress.M365Account]: `Checking ${Progress.M365Account}`,
});

// The new preview cmd `teamsfx preview --env ...`
export default class PreviewEnv extends YargsCommand {
  public readonly commandHead = `preview`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Preview the current application.";

  protected runningTasks: Task[] = [];

  private readonly telemetryProperties: { [key: string]: string } = {};
  private readonly telemetryMeasurements: { [key: string]: number } = {};

  public builder(yargs: Argv): Argv<any> {
    yargs
      .options(RootFolderOptions)
      .options("env", {
        description: "Select an existing env for the project",
        string: true,
        default: environmentManager.getLocalEnvName(),
      })
      .options("run-command", {
        description:
          "The command to start local service. Work for 'local' environment only. If undefined, teamsfx will use the auto detected one from project type (`npm run dev:teamsfx` or `dotnet run` or `func start`). If empty, teamsfx will skip starting local service.",
        string: true,
      })
      .options("running-pattern", {
        description: `The ready signal output that service is launched. Work for 'local' environment only. If undefined, teamsfx will use the default common pattern ("${constants.defaultRunningPattern.source}"). If empty, teamsfx treats process start as ready signal.`,
        string: true,
      })
      .options("open-only", {
        description:
          "Work for 'local' environment only. If true, directly open web client without launching local service.",
        boolean: true,
        default: false,
      })
      .options("m365-host", {
        description: "Preview the application in Teams, Outlook or the Microsoft 365 app",
        string: true,
        choices: [constants.Hub.teams, constants.Hub.outlook, constants.Hub.office],
        default: constants.Hub.teams,
      })
      .options("browser", {
        description: "Select browser to open Teams web client",
        string: true,
        choices: [constants.Browser.chrome, constants.Browser.edge, constants.Browser.default],
        default: constants.Browser.default,
      })
      .options("browser-arg", {
        description: 'Argument to pass to the browser (e.g. --browser-args="--guest")',
        string: true,
        array: true,
      });
    return yargs.version(false);
  }

  public async runCommand(args: {
    [argName: string]: boolean | string | string[] | undefined;
  }): Promise<Result<null, FxError>> {
    if (args.folder === undefined || !isWorkspaceSupported(args.folder as string)) {
      return err(errors.WorkspaceNotSupported(args.folder as string));
    }
    const workspaceFolder = path.resolve(args.folder as string);
    const env = (args.env as string) ?? "";
    const runCommand: string | undefined = args["run-command"] as string;
    const runningPattern = args["running-pattern"] as string;
    const openOnly = args["open-only"] as boolean;
    const hub = args["m365-host"] as constants.Hub;
    const browser = args.browser as constants.Browser;
    const browserArguments = (args["browser-arg"] as string[]) ?? [];

    cliTelemetry.withRootFolder(workspaceFolder);
    this.telemetryProperties[TelemetryProperty.PreviewType] =
      env.toLowerCase() === environmentManager.getLocalEnvName() ? "local" : `remote-${env}`;
    this.telemetryProperties[TelemetryProperty.PreviewHub] = hub;
    this.telemetryProperties[TelemetryProperty.PreviewBrowser] = browser;

    return await localTelemetryReporter.runWithTelemetryGeneric(
      TelemetryEvent.Preview,
      async () =>
        this.doPreview(
          workspaceFolder,
          env,
          runCommand,
          runningPattern,
          openOnly,
          hub,
          browser,
          browserArguments
        ),
      (result: Result<null, FxError>, ctx: TelemetryContext) => {
        // whether on success or failure, send this.telemetryProperties and this.telemetryMeasurements
        Object.assign(ctx.properties, this.telemetryProperties);
        Object.assign(ctx.measurements, this.telemetryMeasurements);
        return result.isErr() ? result.error : undefined;
      },
      this.telemetryProperties
    );
  }

  protected async doPreview(
    workspaceFolder: string,
    env: string,
    runCommand: string | undefined,
    runningPattern: string,
    openOnly: boolean,
    hub: constants.Hub,
    browser: constants.Browser,
    browserArguments: string[]
  ): Promise<Result<null, FxError>> {
    // 1. load envs
    const envRes = await envUtil.readEnv(workspaceFolder, env, false, false);
    if (envRes.isErr()) {
      return err(envRes.error);
    }
    const envs = envRes.value;
    if (envs.TEAMS_APP_ID === undefined) {
      return err(errors.TeamsAppIdNotExistsV3());
    }
    this.telemetryProperties[TelemetryProperty.PreviewAppId] = envs.TEAMS_APP_ID as string;

    // 2. check m365 account
    const accountInfoRes = await localTelemetryReporter.runWithTelemetry(
      TelemetryEvent.PreviewPrereqsCheckM365Account,
      () => this.checkM365Account(envs.TEAMS_APP_TENANT_ID)
    );
    if (accountInfoRes.isErr()) {
      return err(accountInfoRes.error);
    }

    // 3. detect project type and set run-command, running-pattern
    if (
      !openOnly &&
      runCommand === undefined &&
      env.toLowerCase() === environmentManager.getLocalEnvName()
    ) {
      const runCommandRes = await this.detectRunCommand(workspaceFolder);
      if (runCommandRes.isErr()) {
        return err(runCommandRes.error);
      }
      runCommand = runCommandRes.value.runCommand;
      cliLogger.necessaryLog(
        LogLevel.Info,
        getColorizedString([
          { content: constants.runCommand.detectRunCommand, color: Colors.WHITE },
          { content: runCommand, color: Colors.BRIGHT_MAGENTA },
        ])
      );
    }
    runCommand = runCommand === "" ? undefined : runCommand;
    const runningPatternRegex =
      runningPattern !== undefined
        ? runningPattern === ""
          ? new RegExp(".*", "i")
          : new RegExp(runningPattern, "i")
        : constants.defaultRunningPattern;

    try {
      // 4. run command as background task
      this.runningTasks = [];
      if (runCommand !== undefined && env.toLowerCase() === environmentManager.getLocalEnvName()) {
        const runTaskRes = await localTelemetryReporter.runWithTelemetry(
          TelemetryEvent.PreviewStartServices,
          () => this.runCommandAsTask(workspaceFolder, runCommand!, runningPatternRegex)
        );
        if (runTaskRes.isErr()) {
          throw runTaskRes.error;
        }
      }

      // 5: open web client
      const launchRes = await this.launchBrowser(env, envs, hub, browser, browserArguments);
      if (launchRes.isErr()) {
        throw launchRes.error;
      }
      cliLogger.necessaryLog(LogLevel.Warning, constants.waitCtrlPlusC);
    } catch (error: any) {
      await this.shutDown();
      return err(error);
    }

    return ok(null);
  }

  protected async checkM365Account(appTenantId?: string): Promise<
    Result<
      {
        tenantId?: string;
        loginHint?: string;
      },
      FxError
    >
  > {
    let result = true;
    let summaryMsg = `${Progress.M365Account}`;
    let error = undefined;
    const accountBar = CLIUIInstance.createProgressBar(Progress.M365Account, 1);
    await accountBar.start(ProgressMessage[Progress.M365Account]);
    await accountBar.next(ProgressMessage[Progress.M365Account]);
    let loginHint: string | undefined = undefined;
    let tenantId: string | undefined = undefined;
    try {
      let loginStatusRes = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
      let token = loginStatusRes.isOk() ? loginStatusRes.value.token : undefined;
      if (loginStatusRes.isOk() && loginStatusRes.value.status === signedOut) {
        const tokenRes = await M365TokenInstance.getAccessToken({
          scopes: AppStudioScopes,
          showDialog: true,
        });
        token = tokenRes.isOk() ? tokenRes.value : undefined;
        loginStatusRes = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
      }
      if (token === undefined) {
        result = false;
        summaryMsg = constants.doctorResult.NotSignIn;
      } else {
        const isSideloadingEnabled = await getSideloadingStatus(token);
        if (isSideloadingEnabled === false) {
          // sideloading disabled
          result = false;
          summaryMsg = constants.doctorResult.SideLoadingDisabled;
        }
      }
      const tokenObject = loginStatusRes.isOk() ? loginStatusRes.value.accountInfo : undefined;
      if (tokenObject && tokenObject.upn) {
        loginHint = tokenObject.upn as string;
      }
      if (tokenObject && tokenObject.tid) {
        tenantId = tokenObject.tid as string;
      }
    } catch (err: any) {
      result = false;
      error = assembleError(err, cliSource);
    }
    if (result && loginHint) {
      summaryMsg = constants.doctorResult.SignInSuccess.split("@account").join(`${loginHint}`);
    }
    await accountBar.end(result);
    cliLogger.necessaryLog(LogLevel.Info, summaryMsg, true);
    if (!result) {
      return error ? err(error) : err(errors.PrerequisitesValidationM365AccountError(summaryMsg));
    }
    if (
      tenantId !== undefined &&
      appTenantId !== undefined &&
      tenantId.toLowerCase() !== appTenantId.toLowerCase()
    ) {
      cliLogger.necessaryLog(LogLevel.Warning, constants.m365SwitchedMessage);
    }
    return ok({ tenantId: tenantId, loginHint: loginHint });
  }

  protected async detectRunCommand(projectPath: string): Promise<
    Result<
      {
        runCommand: string;
      },
      FxError
    >
  > {
    let runCommand: string | undefined = undefined;
    const hasPackageJson = await fs.pathExists(path.join(projectPath, "package.json"));
    const csprojs = (await fs.readdir(projectPath)).filter(
      (f) => path.extname(f).toLowerCase() === ".csproj"
    );
    const hasCsproj = csprojs.length === 1;
    if (hasPackageJson && !hasCsproj) {
      // package.json should have "dev:teamsfx"
      const script = await loadTeamsFxDevScript(projectPath);
      runCommand = script !== undefined ? "npm run dev:teamsfx" : undefined;
    } else if (!hasPackageJson && hasCsproj) {
      const csprojContent = await fs.readFile(path.join(projectPath, csprojs[0]), "utf-8");
      const isFunc =
        /sdk\s*=\s*"\s*microsoft\.net\.sdk\s*"/i.test(csprojContent) &&
        /packagereference.*=\s*"\s*microsoft\.net\.sdk\.functions\s*"/i.test(csprojContent);
      runCommand = isFunc ? "func start" : "dotnet run";
    }
    if (runCommand === undefined) {
      return err(errors.CannotDetectRunCommand());
    }
    return ok({ runCommand: runCommand });
  }

  protected async runCommandAsTask(
    projectPath: string,
    runCommand: string,
    runningPatternRegex: RegExp
  ): Promise<Result<null, FxError>> {
    const taskName = "Run Command";
    const runningTask = new Task(taskName, true, runCommand, undefined, {
      shell: true,
      cwd: projectPath,
    });
    this.runningTasks.push(runningTask);
    const bar = CLIUIInstance.createProgressBar(taskName, 1);
    const startCb = commonUtils.createTaskStartCb(bar, runCommand, this.telemetryProperties);
    const stopCb = commonUtils.createTaskStopCb(bar, this.telemetryProperties);
    const serviceLogWriter = new ServiceLogWriter();
    await serviceLogWriter.init();
    cliLogger.necessaryLog(
      LogLevel.Info,
      getColorizedString([
        { content: `${taskName}: ${constants.runCommand.showWorkingFolder}`, color: Colors.WHITE },
        { content: projectPath, color: Colors.BRIGHT_GREEN },
      ])
    );
    cliLogger.necessaryLog(
      LogLevel.Info,
      getColorizedString([
        { content: `${taskName}: ${constants.runCommand.showCommand}`, color: Colors.WHITE },
        { content: runCommand, color: Colors.BRIGHT_MAGENTA },
      ])
    );
    cliLogger.necessaryLog(
      LogLevel.Info,
      getColorizedString([
        { content: `${taskName}: ${constants.runCommand.showRunningPattern}`, color: Colors.WHITE },
        { content: runningPatternRegex.toString(), color: Colors.BRIGHT_MAGENTA },
      ])
    );
    const taskRes = await runningTask.waitFor(
      runningPatternRegex,
      startCb,
      stopCb,
      undefined,
      serviceLogWriter
    );
    return taskRes.isOk() ? ok(null) : err(taskRes.error);
  }

  protected async launchBrowser(
    env: string,
    envs: { [k: string]: string },
    hub: constants.Hub,
    browser: constants.Browser,
    browserArgs: string[]
  ): Promise<Result<null, FxError>> {
    const teamsAppId = envs.TEAMS_APP_ID as string;
    const teamsAppTenantId = envs.TEAMS_APP_TENANT_ID as string;
    const botId = envs.BOT_ID as string;

    // launch Teams
    if (hub === constants.Hub.teams) {
      await openHubWebClient(
        botId === undefined,
        teamsAppTenantId,
        teamsAppId,
        hub,
        browser,
        browserArgs,
        this.telemetryProperties
      );
      return ok(null);
    }

    // launch Outlook or Office
    let internalId: string | undefined = envs["M365_APP_ID"];
    if (!internalId) {
      if (CLIUIInstance.interactive) {
        const shouldContinue = await showInstallAppInTeamsMessage(
          env.toLowerCase() === environmentManager.getLocalEnvName(),
          teamsAppTenantId,
          teamsAppId,
          undefined,
          browser,
          browserArgs
        );
        if (!shouldContinue) {
          return err(UserCancelError);
        }
      }

      internalId = await getTeamsAppInternalId(teamsAppId);
    }
    if (internalId) {
      await openHubWebClient(
        botId === undefined,
        teamsAppTenantId,
        internalId,
        hub,
        browser,
        browserArgs,
        this.telemetryProperties
      );
      cliLogger.necessaryLog(
        LogLevel.Warning,
        util.format(constants.installApp.nonInteractive.manifestChangesV3, `--env ${env}`)
      );
      cliLogger.necessaryLog(LogLevel.Warning, constants.m365TenantHintMessage);
    } else {
      cliLogger.necessaryLog(
        LogLevel.Warning,
        util.format(constants.installApp.nonInteractive.notInstalled, `--env ${env}`)
      );
    }

    return ok(null);
  }

  private async shutDown() {
    for (const task of this.runningTasks) {
      await task.terminate();
    }
  }
}
