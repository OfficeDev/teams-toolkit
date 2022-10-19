// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";
import { Constants } from "../utility/constants";

const errorCode = "GetTenantFailed";
const messageKey = "plugins.spfx.GetTenantFailedError";

export class GetTenantFailedError extends SystemError {
  constructor(username?: string, error?: Error) {
    super({
      source: Constants.DeployDriverName,
      name: errorCode,
    });
    // TODO: move strings to the localization file
    const param1 = username ? `for user ${username} ` : "";
    const param2 = error ? `due to error ${error.message}` : "";
    this.message = getDefaultString("plugins.spfx.GetTenantFailedError", param1, param2);
    this.displayMessage = getLocalizedString("plugins.spfx.GetTenantFailedError", param1, param2);
  }
}
