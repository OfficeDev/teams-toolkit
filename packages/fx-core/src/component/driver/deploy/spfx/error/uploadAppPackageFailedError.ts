// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";
import { Constants } from "../utility/constants";

const errorCode = "UploadAppPackageFailed";
const messageKey = "plugins.spfx.uploadAppcatalogFail";

export class UploadAppPackageFailedError extends SystemError {
  constructor(error: Error) {
    super({
      source: Constants.DeployDriverName,
      name: errorCode,
      message: getDefaultString(messageKey, error.message),
      displayMessage: getLocalizedString(messageKey, error.message),
    });
  }
}
