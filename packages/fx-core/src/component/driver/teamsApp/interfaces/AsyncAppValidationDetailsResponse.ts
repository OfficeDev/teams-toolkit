// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AsyncAppValidationStatus } from "./AsyncAppValidationResponse";

export interface AsyncAppValidationDetailsResponse {
  continuationToken?: string;
  appValidations?: AsyncAppValidationDetailsViewModel[];
}

export interface AsyncAppValidationDetailsViewModel {
  /**
   * app validation id
   */
  id: string;
  /**
   * Teams app id
   */
  appId: string;
  appVersion: string;
  manifestVersion: string;
  status: AsyncAppValidationStatus;
  createdAt: Date;
  updatedAt: Date;
}
