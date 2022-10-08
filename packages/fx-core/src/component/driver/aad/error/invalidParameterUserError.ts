// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "InvalidParameter";
const messageKey = "driver.aadApp.error.invalidParameter";

export class InvalidParameterUserError extends UserError {
  constructor(actionName: string, invalidParameters: string | string[], helpLink: string) {
    let parameterList;
    if (Array.isArray(invalidParameters)) {
      parameterList = invalidParameters.join(", ");
    } else {
      parameterList = invalidParameters;
    }
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, actionName, parameterList),
      displayMessage: getLocalizedString(messageKey, actionName, parameterList),
      helpLink: helpLink,
    });
  }
}
