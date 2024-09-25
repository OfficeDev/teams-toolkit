// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { QuestionNames, newResourceGroupOption } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, IgnoreLoadEnvOption, ProjectFolderOption } from "../common";

export const provisionCommand: CLICommand = {
  name: "provision",
  description: commands.provision.description,
  options: [
    EnvOption,
    ProjectFolderOption,
    {
      name: "resource-group",
      description: commands.provision.options["resource-group"],
      type: "string",
      hidden: true,
    },
    {
      name: "region",
      description: commands.provision.options.region,
      type: "string",
      hidden: true,
    },
    IgnoreLoadEnvOption,
  ],
  telemetry: {
    event: TelemetryEvent.Provision,
  },
  handler: async (ctx: CLIContext) => {
    const core = getFxCore();
    const inputs = ctx.optionValues as InputsWithProjectPath;
    if (!ctx.globalOptionValues.interactive) {
      if (inputs["region"]) {
        inputs[QuestionNames.TargetResourceGroupName] = {
          id: newResourceGroupOption,
          label: newResourceGroupOption,
        };
        inputs[QuestionNames.NewResourceGroupName] = inputs["resource-group"];
        inputs[QuestionNames.NewResourceGroupLocation] = inputs["region"];
      }
    }
    const res = await core.provisionResources(inputs);
    return res;
  },
};
