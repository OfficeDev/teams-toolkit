// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const CreateEnvOptions: CLICommandOption[] = [
  {
    name: "env",
    questionName: "sourceEnvName",
    type: "singleSelect",
    description: "Specifies an existing environment name to copy from.",
    required: true,
  },
];
export const CreateEnvArguments: CLICommandArgument[] = [
  {
    name: "name",
    questionName: "newTargetEnvName",
    type: "text",
    description: "Specifies the new environment name.",
    required: true,
  },
];
