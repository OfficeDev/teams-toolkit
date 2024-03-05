// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Response details for the Async App Validation request submitted.
 */
export interface AsyncAppValidationResponse {
  status: AsyncAppValidationStatus;
  appValidationId: string;
}

/**
 * Async app validation status
 */
export enum AsyncAppValidationStatus {
  Created = "Created",
  InProgress = "InProgress",
  Completed = "Completed",
  Aborted = "Aborted",
}
