// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { constants } from "../utility/constants";

const errorCode = "CredentialInvalidLifetime";
const messageKey = "driver.aadApp.error.credentialInvalidLifetimeAsPerAppPolicy";

export class CredentialInvalidLifetimeError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey),
      helpLink: constants.defaultHelpLink,
    });
  }
}
