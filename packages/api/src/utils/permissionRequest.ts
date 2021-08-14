// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";

/**
 * AAD permission request provider
 */
export interface PermissionRequestProvider {
  /**
   * Load the content of the latest permission request
   */
  getPermissionRequest(): Promise<Result<string, FxError>>;
}
