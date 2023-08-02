// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import * as constants from "../../cmds/preview/constants";
import PreviewEnv from "../../cmds/preview/previewEnv";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, ProjectFolderOption } from "../common";
import { PreviewTeamsAppInputs, PreviewTeamsAppOptions } from "@microsoft/teamsfx-core";
import { Hub } from "../../cmds/preview/constants";

export const previewCommand: CLICommand = {
  name: "preview",
  description: "Preview the current application.",
  options: [
    ...PreviewTeamsAppOptions.map((option) => {
      if (option.name === "teams-manifest-file") {
        option.default = "./appPackage/manifest.json";
      }
      return option;
    }),
    {
      name: "run-command",
      type: "text",
      shortName: "c",
      description:
        "The command to start local service. Work for 'local' environment only. If undefined, teamsfx will use the auto detected one from project type (`npm run dev:teamsfx` or `dotnet run` or `func start`). If empty, teamsfx will skip starting local service.",
    },
    {
      name: "running-pattern",
      shortName: "p",
      type: "text",
      description: `The ready signal output that service is launched. Work for 'local' environment only. If undefined, teamsfx will use the default common pattern ("${constants.defaultRunningPattern.source}"). If empty, teamsfx treats process start as ready signal.`,
    },
    {
      name: "open-only",
      type: "boolean",
      shortName: "o",
      description:
        "Work for 'local' environment only. If true, directly open web client without launching local service.",
      default: false,
    },
    {
      name: "browser",
      type: "singleSelect",
      shortName: "b",
      description: "Select browser to open Teams web client.",
      choices: [constants.Browser.chrome, constants.Browser.edge, constants.Browser.default],
      default: constants.Browser.default,
    },
    {
      name: "browser-arg",
      type: "text",
      shortName: "ba",
      description: `Argument to pass to the browser (e.g. --browser-args="--guest")`,
    },
    {
      name: "exec-path",
      type: "text",
      shortName: "ep",
      description:
        'The paths that will be added to the system environment variable PATH when the command is executed, defaults to "${folder}/devTools/func".',
      default: constants.defaultExecPath,
    },
    EnvOption,
    ProjectFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.Preview,
  },
  handler: async (ctx: CLIContext) => {
    const inputs = getSystemInputs() as PreviewTeamsAppInputs;
    assign(inputs, ctx.optionValues);
    const workspaceFolder = inputs.projectPath as string;
    const env = inputs.env as string;
    const manifestFilePath = inputs["manifest-path"] as string;
    const command = inputs["run-command"] as string;
    const runningPattern = inputs["running-pattern"] as string;
    const openOnly = inputs["open-only"] as boolean;
    const m365Host = inputs["m365-host"] as constants.Hub;
    const execPath: string = inputs["exec-path"] as string;
    const browser = inputs.browser as constants.Browser;
    const browserArguments = (inputs["browser-arg"] as string[]) ?? [];
    const cmd = new PreviewEnv();
    const res = await cmd.runCommand(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
