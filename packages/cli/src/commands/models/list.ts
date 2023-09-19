// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { listSamplesCommand } from "./listSamples";
import { listCapabilitiesCommand } from "./listCapabilities";

export const listCommand: CLICommand = {
  name: "list",
  description: "List available options.",
  commands: [listSamplesCommand, listCapabilitiesCommand],
};
