// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";

export const permissionStatusCommand: CLICommand = {
  name: "status",
  description: "Check user's permission.",
  options: [],
  handler: async (ctx) => {
    return ok(undefined);
  },
};
