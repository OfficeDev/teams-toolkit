// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";

/**
 * Microsoft Entra permission request provider
 */
export interface PermissionRequestProvider {
  /**
   * check if perrmission request source content exists
   */
  checkPermissionRequest(): Promise<Result<undefined, FxError>>;

  /**
   * Load the content of the latest permission request
   */
  getPermissionRequest(): Promise<Result<string, FxError>>;
}
