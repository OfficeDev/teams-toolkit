// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CLICommand,
  CLICommandOption,
  CLIContext,
  CLIStringOption,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  CreateProjectInputs,
  CreateProjectOptions,
  QuestionNames,
  isCopilotPluginEnabled,
  CliQuestionName,
} from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as uuid from "uuid";
import { getFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import { createSampleCommand } from "./createSample";
import * as path from "path";

function filterOptionsIfNotCopilotPlugin(options: CLICommandOption[]) {
  if (!isCopilotPluginEnabled()) {
    // filter out copilot-plugin in capability question
    const capability = options.find(
      (c: CLICommandOption) => c.name === CliQuestionName.Capability
    ) as CLIStringOption;
    if (capability.choices) {
      capability.choices = capability.choices.filter(
        (c: string) => c !== "copilot-plugin-capability"
      );
    }

    const copilotPluginQuestionNames = [
      QuestionNames.CopilotPluginDevelopment.toString(),
      QuestionNames.ApiSpecLocation.toString(),
      QuestionNames.OpenAIPluginDomain.toString(),
      QuestionNames.ApiOperation.toString(),
    ];

    options = options.filter((option) => !copilotPluginQuestionNames.includes(option.name));
  }
  return options;
}

export function getCreateCommand(): CLICommand {
  return {
    name: "new",
    description: "Create a new Teams application.",
    options: [...filterOptionsIfNotCopilotPlugin(CreateProjectOptions)],
    examples: [
      {
        command: "teamsfx new -c notification -t timer-functions -l typescript -n myapp -i false",
        description: "Create a new timer triggered notification bot",
      },
      {
        command: "teamsfx new -c tab-spfx -ss import --sf <folder-path> -n myapp -i false",
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
      logger.info(`Project created at: ${chalk.cyanBright(path.resolve(res.value.projectPath))}`);
      return ok(undefined);
    },
  };
}
