// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";
import { Constants } from "../utility/constants";

const errorCode = "GetGraphTokenFailed";
const messageKey = "plugins.spfx.cannotGetGraphToken";

export class GetGraphTokenFailedError extends SystemError {
  constructor() {
    super({
      source: Constants.DeployDriverName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey),
    });
  }
}
