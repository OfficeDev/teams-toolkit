// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "OauthAuthMissingInSpec";
const messageKey = "driver.oauth.error.oauthAuthMissingInSpec";

export class OauthAuthMissingInSpec extends UserError {
  constructor(actionName: string, authName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, authName),
      displayMessage: getLocalizedString(messageKey, authName),
    });
  }
}
