// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "MissingEnvironmentVariable";
const messageKey = "driver.aadApp.error.missingEnv";

export class MissingEnvUserError extends UserError {
  constructor(
    actionName: string,
    missingEnvs: string | string[],
    helpLink: string,
    additionalMessageKey: string
  ) {
    let envList;
    if (Array.isArray(missingEnvs)) {
      envList = missingEnvs.join(", ");
    } else {
      envList = missingEnvs;
    }

    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(additionalMessageKey) + " " + getDefaultString(messageKey, envList),
      displayMessage:
        getLocalizedString(additionalMessageKey) + " " + getLocalizedString(messageKey, envList),
      helpLink: helpLink,
    });
  }
}
