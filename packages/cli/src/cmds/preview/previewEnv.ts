// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import { Argv } from "yargs";
import { FxError, ok, Result } from "@microsoft/teamsfx-api";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import * as constants from "./constants";
import { YargsCommand } from "../../yargsCommand";

// The new preview cmd `teamsfx preview --env ...`
export default class PreviewEnv extends YargsCommand {
  public readonly commandHead = `preview`;
  public readonly command = `${this.commandHead}`;
  public readonly description = "Preview the current application.";

  public builder(yargs: Argv): Argv<any> {
    yargs.option("folder", {
      description: "Select root folder of the project",
      string: true,
      default: "./",
    });
    yargs.option("env", {
      description: "Select an existing env for the project",
      string: true,
      default: environmentManager.getLocalEnvName(),
    });
    yargs.option("run-command", {
      description:
        "The command to start local service. Work for 'local' environment only. If undefined, teamsfx will use the auto detected one from project type (`npm run dev:teamsfx` or `dotnet run` or `func start`). If empty, teamsfx will skip starting local service.",
      string: true,
    });
    yargs.option("running-pattern", {
      description: `The ready signal output that service is launched. Work for 'local' environment only. If undefined, teamsfx will use the default common pattern ("${constants.defaultRunningPattern.source}"). If empty, teamsfx treats process start as ready signal.`,
      string: true,
    });
    yargs.option("m365-host", {
      description: "Preview the application in Teams, Outlook or Office",
      string: true,
      choices: [constants.Hub.teams, constants.Hub.outlook, constants.Hub.office],
      default: constants.Hub.teams,
    });
    yargs.option("browser", {
      description: "Select browser to open Teams web client",
      string: true,
      choices: [constants.Browser.chrome, constants.Browser.edge, constants.Browser.default],
      default: constants.Browser.default,
    });
    yargs.option("browser-arg", {
      description: 'Argument to pass to the browser (e.g. --browser-args="--guest")',
      string: true,
      array: true,
    });
    return yargs.version(false);
  }

  public async runCommand(args: {
    [argName: string]: boolean | string | string[] | undefined;
  }): Promise<Result<null, FxError>> {
    const workspaceFolder = path.resolve(args.folder as string);
    const env = args.env as string;
    const runCommand = args["run-command"] as string;
    const runningPattern = args["running-pattern"] as string;
    const hub = args["m365-host"] as constants.Hub;
    const browser = args.browser as constants.Browser;
    const browserArguments = args["browser-arg"] as string[];

    // TODO: Add preview logic
    return ok(null);
  }
}
