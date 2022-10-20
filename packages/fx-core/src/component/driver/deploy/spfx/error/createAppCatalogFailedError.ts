// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";
import { Constants } from "../utility/constants";

const errorCode = "CreateAppCatalogFailed";
const messageKey = "plugins.spfx.createAppcatalogFail";

export class CreateAppCatalogFailedError extends SystemError {
  constructor(error: Error) {
    super({
      source: Constants.DeployDriverName,
      name: errorCode,
      message: getDefaultString(messageKey, error.message, error.stack),
      displayMessage: getLocalizedString(messageKey, error.message, error.stack),
    });
  }
}
