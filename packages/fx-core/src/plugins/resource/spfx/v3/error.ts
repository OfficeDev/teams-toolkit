// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { returnSystemError, returnUserError, SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "../utils/constants";

export function SPFxAlreadyExistError(): UserError {
  return returnUserError(
    new Error("Add capability/resource is not supported for SPFx projects"),
    Constants.PLUGIN_NAME,
    "AddFeatureNotSupported"
  );
}

export function LoadManifestError(): SystemError {
  return returnSystemError(
    new Error("Failed to load manifest!"),
    Constants.PLUGIN_NAME,
    "LoadManifestError"
  );
}

export function SaveManifestError(): SystemError {
  return returnSystemError(
    new Error("Failed to save manifest!"),
    Constants.PLUGIN_NAME,
    "SaveManifestError"
  );
}
