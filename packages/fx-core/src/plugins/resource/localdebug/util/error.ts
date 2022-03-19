// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

export function MissingStep(operation: string, requiredStep: string): UserError {
  return new UserError(
    "MissingStep",
    "localdebug-plugin",
    getDefaultString("error.MissingStep", requiredStep, operation),
    getLocalizedString("error.MissingStep", requiredStep, operation)
  );
}
