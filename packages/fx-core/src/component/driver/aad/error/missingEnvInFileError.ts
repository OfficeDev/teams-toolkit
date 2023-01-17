// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "MissingEnvironmentVariable";
const messageKey = "driver.aadApp.error.missingEnvInFile";

export class MissingEnvInFileUserError extends UserError {
  constructor(
    actionName: string,
    missingEnvs: string | string[],
    helpLink: string,
    additionalMessageKey: string,
    filePath: string
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
      message: getDefaultString(
        messageKey,
        getDefaultString(additionalMessageKey),
        envList,
        filePath
      ),
      displayMessage: getLocalizedString(
        messageKey,
        getLocalizedString(additionalMessageKey),
        envList,
        filePath
      ),
      helpLink: helpLink,
    });
  }
}
