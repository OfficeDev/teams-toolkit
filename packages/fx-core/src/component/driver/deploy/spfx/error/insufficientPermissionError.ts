// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";
import { Constants } from "../utility/constants";

const errorCode = "InsufficientPermission";
const messageKey = "plugins.spfx.insufficientPermission";

export class InsufficientPermissionError extends UserError {
  constructor(appCatalog: string) {
    super({
      source: Constants.DeployDriverName,
      name: errorCode,
      message: getDefaultString(messageKey, appCatalog, Constants.DevProgramLink),
      displayMessage: getLocalizedString(messageKey, appCatalog, Constants.DevProgramLink),
    });
  }
}
