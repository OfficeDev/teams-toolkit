// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, CLIContext, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { getFxCore } from "../../activate";
import { strings } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { EnvOption, ProjectFolderOption } from "../common";
import { CoreQuestionNames } from "@microsoft/teamsfx-core";
import { newResourceGroupOption } from "@microsoft/teamsfx-core/build/question/other";

export const provisionCommand: CLICommand = {
  name: "provision",
  description: strings.command.provision.description,
  options: [
    EnvOption,
    ProjectFolderOption,
    {
      name: "resource-group",
      description: "Specifies resource group name.",
      type: "string",
      hidden: true,
    },
    {
      name: "region",
      description: "Specifies resource group region.",
      type: "string",
      hidden: true,
    },
  ],
  telemetry: {
    event: TelemetryEvent.Provision,
  },
  handler: async (ctx: CLIContext) => {
    const core = getFxCore();
    const inputs = ctx.optionValues as InputsWithProjectPath;
    if (!ctx.globalOptionValues.interactive) {
      if (inputs["region"]) {
        inputs[CoreQuestionNames.TargetResourceGroupName] = {
          id: newResourceGroupOption,
          label: newResourceGroupOption,
        };
        inputs[CoreQuestionNames.NewResourceGroupName] = inputs["resource-group"];
        inputs[CoreQuestionNames.NewResourceGroupLocation] = inputs["region"];
      }
    }
    const res = await core.provisionResources(inputs);
    return res;
  },
};
