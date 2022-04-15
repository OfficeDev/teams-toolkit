// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import inquirer from "inquirer";
import CustomizedCheckboxPrompt from "./customizedCheckboxPrompt";
import CustomizedListPrompt from "./customizedListPrompt";

export interface ChoiceOptions {
  name: string;
  extra: {
    title: string;
    description?: string;
    detail?: string;
  };
}

export function registerPrompts() {
  inquirer.registerPrompt("checkbox", CustomizedCheckboxPrompt);
  inquirer.registerPrompt("list", CustomizedListPrompt);
}
