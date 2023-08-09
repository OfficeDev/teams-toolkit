// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export class NoNeedUpgradeError extends UserError {
  constructor() {
    super({
      message: getDefaultString("error.upgrade.NoNeedUpgrade"),
      displayMessage: getLocalizedString("error.upgrade.NoNeedUpgrade"),
      source: "upgrade",
    });
  }
}
