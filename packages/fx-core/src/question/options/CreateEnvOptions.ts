// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const CreateEnvOptions: CLICommandOption[] = [
  {
    name: "env",
    questionName: "sourceEnvName",
    type: "string",
    description: "Specifies an existing environment name to copy from.",
    required: true,
  },
];
export const CreateEnvArguments: CLICommandArgument[] = [
  {
    name: "name",
    questionName: "newTargetEnvName",
    type: "string",
    description: "Specifies the new environment name.",
    required: true,
  },
];
