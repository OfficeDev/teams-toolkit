// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";
import { Constants } from "../utility/constants";

const errorCode = "NoSharePointPackage";
const messageKey = "plugins.spfx.cannotFindPackage";

export class NoSPPackageError extends UserError {
  constructor(distFolder: string) {
    super({
      source: Constants.DeployDriverName,
      name: errorCode,
      message: getDefaultString(messageKey, distFolder),
      displayMessage: getLocalizedString(messageKey, distFolder),
    });
  }
}
