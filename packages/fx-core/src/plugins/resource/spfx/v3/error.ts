// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { Constants } from "../utils/constants";

export function SPFxAlreadyExistError(): UserError {
  return new UserError(
    Constants.PLUGIN_NAME,
    "AddFeatureNotSupported",
    getDefaultString("plugins.spfx.SPFxAlreadyExistError"),
    getLocalizedString("plugins.spfx.SPFxAlreadyExistError")
  );
}
