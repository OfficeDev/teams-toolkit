// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CLICommand,
  CLICommandOption,
  CLIContext,
  OptionItem,
  Platform,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  CapabilityOptions,
  CliQuestionName,
  CreateProjectInputs,
  CreateProjectOptions,
  MeArchitectureOptions,
  QuestionNames,
} from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { assign } from "lodash";
import * as path from "path";
import * as uuid from "uuid";
import { getFxCore } from "../../activate";
import { logger } from "../../commonlib/logger";
import { commands } from "../../resource";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/cliTelemetryEvents";
import { createSampleCommand } from "./createSample";

function adjustOptions(options: CLICommandOption[]) {
  for (const option of options) {
    if (option.type === "string" && option.name === CliQuestionName.Capability) {
      // use dynamic options for capability question
      option.choices = CapabilityOptions.all({ platform: Platform.CLI }).map((o) => o.id);
      break;
    }
  }

  for (const option of options) {
    if (option.type === "string" && option.name === QuestionNames.MeArchitectureType.toString()) {
      // use dynamic options for ME architecture question
      option.choices = MeArchitectureOptions.all().map((o: OptionItem) => o.id);
      break;
    }
  }

  // if (!isCopilotExtensionEnabled()) {
  //   //skip Copilot extension questions if the feature flag is not enabled.
  //   const questionsToDelete = [
  //     QuestionNames.ApiPluginType,
  //     QuestionNames.WithPlugin,
  //     QuestionNames.PluginManifestFilePath,
  //     QuestionNames.PluginOpenApiSpecFilePath,
  //   ];
  //   options = options.filter((option) => !questionsToDelete.includes(option.name as QuestionNames));
  // }

  return options;
}

export function getCreateCommand(): CLICommand {
  return {
    name: "new",
    description: commands.create.description,
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
