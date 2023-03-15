// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { Constants } from "../utility/constants";

const errorCode = "NoConfigurationFile";
const messageKey = "plugins.spfx.error.noConfiguration";

export class NoConfigurationError extends UserError {
  constructor() {
    super({
      source: Constants.ActionName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey),
    });
  }
}
