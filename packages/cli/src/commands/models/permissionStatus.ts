// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok } from "@microsoft/teamsfx-api";
import { CLICommand } from "../types";

export const permissionStatusCommand: CLICommand = {
  name: "status",
  description: "Check user's permission.",
  options: [],
  handler: async (ctx) => {
    return ok(undefined);
  },
};
