// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, err, ok } from "@microsoft/teamsfx-api";
import { assign } from "lodash";
import * as constants from "../../cmds/preview/constants";
import PreviewEnv from "../../cmds/preview/previewEnv";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { EnvOption, RootFolderOption } from "../common";

export const previewCommand: CLICommand = {
  name: "preview",
  description: "Preview the current application.",
  options: [
    EnvOption,
    {
      name: "manifest-file-path",
      shortName: "m",
      type: "text",
      default: "./appPackage/manifest.json",
      description: "Specifies the Teams app manifest file path.",
      required: true,
    },
    {
      name: "run-command",
      type: "text",
      shortName: "c",
      description:
        "The command to start local service. Work for 'local' environment only. If undefined, teamsfx will use the auto detected one from project type (`npm run dev:teamsfx` or `dotnet run` or `func start`). If empty, teamsfx will skip starting local service.",
    },
    {
      name: "running-pattern",
      shortName: "sp",
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
      name: "m365-host",
      type: "singleSelect",
      shortName: "mh",
      description: "Preview the application in Teams, Outlook or the Microsoft 365 app.",
      choices: [constants.Hub.teams, constants.Hub.outlook, constants.Hub.office],
      default: constants.Hub.teams,
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
      shortName: "ba",
      description:
        'The paths that will be added to the system environment variable PATH when the command is executed, defaults to "${folder}/devTools/func".',
      default: constants.defaultExecPath,
    },
    RootFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.Preview,
  },
  handler: async (ctx: CLIContext) => {
    const inputs = getSystemInputs();
    if (!ctx.globalOptionValues.interactive) {
      assign(inputs, ctx.optionValues);
    }
    const cmd = new PreviewEnv();
    const res = await cmd.runCommand(inputs);
    if (res.isErr()) {
      return err(res.error);
    }
    return ok(undefined);
  },
};
