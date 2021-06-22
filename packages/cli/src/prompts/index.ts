// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import inquirer from "inquirer";
import CustomizedCheckboxPrompt from "./customizedCheckboxPrompt";
import CustomizedListPrompt from "./customizedListPrompt";

export function registerPrompts() {
    inquirer.registerPrompt("checkbox", CustomizedCheckboxPrompt);
    inquirer.registerPrompt("list", CustomizedListPrompt);
}
