// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "../types";
import { envAddCommand } from "./envAdd";
import { envListCommand } from "./envList";

export const envCommand: CLICommand = {
  name: "env",
  description: "Manage environments.",
  commands: [envAddCommand, envListCommand],
};
