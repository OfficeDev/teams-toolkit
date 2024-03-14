// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../activate";
import { strings } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import {
  EnvOption,
  IgnoreLoadEnvOption,
  ProjectFolderOption,
  ConfigFilePathOption,
} from "../common";

export const deployCommand: CLICommand = {
  name: "deploy",
  description: strings.command.deploy.description,
  options: [EnvOption, ProjectFolderOption, IgnoreLoadEnvOption, ConfigFilePathOption],
  telemetry: {
    event: TelemetryEvent.Deploy,
  },
  handler: async (ctx: CLIContext) => {
    const core = getFxCore();
    const inputs = ctx.optionValues as InputsWithProjectPath;
    if (inputs["config-file-path"]) {
      process.env.TEAMSFX_CONFIG_FILE_PATH = inputs["config-file-path"];
    }
    const res = await core.deployArtifacts(inputs);
    return res;
  },
};
