// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CLICommand,
  CLICommandOption,
  CLIContext,
  Platform,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  CapabilityOptions,
  CliQuestionName,
  CreateProjectInputs,
  CreateProjectOptions,
  QuestionNames,
  isApiCopilotPluginEnabled,
} from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as path from "path";
import * as uuid from "uuid";
import { getFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import { createSampleCommand } from "./createSample";

function adjustOptions(options: CLICommandOption[]) {
  if (!isApiCopilotPluginEnabled()) {
    //skip copilot plugin options if API copilot plugin is not enabled
    const copilotPluginQuestionNames = [
      QuestionNames.ApiSpecLocation.toString(),
      QuestionNames.OpenAIPluginManifest.toString(),
      QuestionNames.ApiOperation.toString(),
    ];
    options = options.filter((option) => !copilotPluginQuestionNames.includes(option.name));
  }
  for (const option of options) {
    if (option.type === "string" && option.name === CliQuestionName.Capability) {
      // use dynamic options for capability question
      option.choices = CapabilityOptions.all({ platform: Platform.CLI }).map((o) => o.id);
      break;
    }
  }
  return options;
}

export function getCreateCommand(): CLICommand {
  return {
    name: "new",
    description: "Create a new Microsoft Teams application.",
    options: [...adjustOptions(CreateProjectOptions)],
    examples: [
      {
        command: `${process.env.TEAMSFX_CLI_BIN_NAME} new -c notification -t timer-functions -l typescript -n myapp -i false`,
        description: "Create a new timer triggered notification bot",
      },
      {
        command: `${process.env.TEAMSFX_CLI_BIN_NAME} new -c tab-spfx -s import --spfx-folder <folder-path> -n myapp -i false`,
        description: "Import an existing SharePoint Framework solution",
      },
    ],
    commands: [createSampleCommand],
    telemetry: {
      event: TelemetryEvent.CreateProject,
    },
    handler: async (ctx: CLIContext) => {
      const inputs = ctx.optionValues as CreateProjectInputs;
      inputs.projectId = inputs.projectId ?? uuid.v4();
      const core = getFxCore();
      const res = await core.createProject(inputs);
      assign(ctx.telemetryProperties, {
        [TelemetryProperty.NewProjectId]: inputs.projectId,
        [TelemetryProperty.IsCreatingM365]: inputs.isM365 + "",
      });
      if (res.isErr()) {
        return err(res.error);
      }
      logger.info(`Project created at: ${chalk.cyan(path.resolve(res.value.projectPath))}`);
      return ok(undefined);
    },
  };
}
