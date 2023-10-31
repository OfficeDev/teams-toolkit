// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "InvalidFieldInManifest";
const messageKey = "driver.aadApp.error.invalidFieldInManifest"; // Field %s is missing or invalid in Microsoft Entra app manifest.

export class MissingFieldInManifestUserError extends UserError {
  constructor(actionName: string, missingFields: string | string[], helpLink: string) {
    let fieldList;
    if (Array.isArray(missingFields)) {
      fieldList = missingFields.join(", ");
    } else {
      fieldList = missingFields;
    }

    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, fieldList),
      displayMessage: getLocalizedString(messageKey, fieldList),
      helpLink: helpLink,
    });
  }
}
