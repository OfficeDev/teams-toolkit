// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { commands } from "../../resource";
import { addSPFxWebpartCommand } from "./addSPFxWebpart";
import { addPluginCommand } from "./addPlugin";
import { FeatureFlags, featureFlagManager } from "@microsoft/teamsfx-core";

const adjustCommands = (): CLICommand[] => {
  if (featureFlagManager.getBooleanValue(FeatureFlags.CustomizeGpt)) {
    return [addSPFxWebpartCommand, addPluginCommand];
  } else {
    return [addSPFxWebpartCommand];
  }
};
export function addCommand(): CLICommand {
  return {
    name: "add",
    description: commands.add.description,
    commands: adjustCommands(),
  };
}
