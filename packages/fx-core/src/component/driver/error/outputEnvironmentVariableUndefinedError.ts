// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

const errorCode = "OutputEnvironmentVariableUndefined";
const messageKey = "error.driver.outputEnvironmentVariableUndefined"; // The output environment variable name(s) are not defined.

// This error should only be thrown when an internal logic calls the action directly. If users defines wrong output env vars in the yml file, the schema validation is expected to find the error and instruct users to fix them.
export class OutputEnvironmentVariableUndefinedError extends SystemError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey),
    });
  }
}
