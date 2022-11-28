// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { Argv } from "yargs";
import { assembleError, err, FxError, LogLevel, ok, Result } from "@microsoft/teamsfx-api";
import { loadTeamsFxDevScript } from "@microsoft/teamsfx-core";
import { AppStudioScopes, getSideloadingStatus } from "@microsoft/teamsfx-core";
import { envUtil } from "@microsoft/teamsfx-core";
import { environmentManager } from "@microsoft/teamsfx-core";
import * as constants from "./constants";
import * as errors from "./errors";
import { signedOut } from "../../commonlib/common/constant";
import cliLogger from "../../commonlib/log";
import M365TokenInstance from "../../commonlib/m365Login";
import { cliSource, RootFolderOptions } from "../../constants";
import CLIUIInstance from "../../userInteraction";
import { isWorkspaceSupported } from "../../utils";
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
      .options("m365-host", {
        description: "Preview the application in Teams, Outlook or Office",
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
    const env = args.env as string;
    let runCommand = args["run-command"] as string;
    const runningPattern = args["running-pattern"] as string;
    const hub = args["m365-host"] as constants.Hub;
    const browser = args.browser as constants.Browser;
    const browserArguments = args["browser-arg"] as string[];

    // TODO: Add telemetry

    // 1. load envs
    const envRes = await envUtil.readEnv(workspaceFolder, env, false, false);
    if (envRes.isErr()) {
      return err(envRes.error);
    }
    const envs = envRes.value;

    // 2. check m365 account
    const accountInfoRes = await this.checkM365Account(envs.TEAMS_APP_TENANT_ID);
    if (accountInfoRes.isErr()) {
      return err(accountInfoRes.error);
    }

    // 3. detect project type and set run-command, running-pattern
    if (runCommand === undefined && env.toLowerCase() === environmentManager.getLocalEnvName()) {
      cliLogger.necessaryLog(LogLevel.Info, "Set 'run-command' by project type.");
      const runCommandRes = await this.detectRunCommand(workspaceFolder);
      if (runCommandRes.isErr()) {
        return err(runCommandRes.error);
      }
      runCommand = runCommandRes.value.runCommand;
      cliLogger.necessaryLog(LogLevel.Info, `Set 'run-command' to ${runCommand}.`);
    }
    const runningPatternRegex =
      runningPattern !== undefined ? new RegExp(runningPattern) : constants.defaultRunningPattern;

    // TODO: more steps
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
    await accountBar.next(summaryMsg);
    await accountBar.end(result);
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
}
