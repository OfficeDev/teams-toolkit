// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  SystemError,
  SystemErrorOptions,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";

const component = "ConfigManager";

export class DriverNotFoundError extends UserError {
  constructor(taskName: string, uses: string) {
    const key = "configManager.error.driverNotFound";
    const errorOptions: UserErrorOptions = {
      source: component,
      name: "DriverNotFoundError",
      message: getDefaultString(key, uses, taskName),
      displayMessage: getLocalizedString(key, uses, taskName),
    };
    // errorOptions.helpLink = helpLink;
    super(errorOptions);
  }
}
