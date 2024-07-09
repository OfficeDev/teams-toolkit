// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { maxDomainPerOauth } from "../utility/constants";

const errorCode = "OauthDomainInvalid";
const messageKey = "driver.oauth.error.domainInvalid";

export class OauthDomainInvalidError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey, maxDomainPerOauth),
    });
  }
}
