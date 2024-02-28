// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AsyncAppValidationStatus } from "./AsyncAppValidationResponse";

export interface AsyncAppValidationResultsResponse {
  appValidationId: string;
  /**
   * Teams app id
   */
  appId: string;
  status: AsyncAppValidationStatus;
  appVersion: string;
  manifestVersion: string;
  createdAt: Date;
  updatedAt: Date;
  validationResults: {
    successes: AsyncAppValidationResult[];
    warnings: AsyncAppValidationResult[];
    failures: AsyncAppValidationResult[];
    skipped: AsyncAppValidationResult[];
  };
}

export interface AsyncAppValidationResult {
  /**
   * The unique code for each validation performed in a test case, e.g. "Validation_ThirdPartyUrl_WebSiteURL"
   */
  title: string;
  message: string;
  /**
   * Validation code details
   */
  artifacts: AsyncAppValidationTestDetails;
}

export interface AsyncAppValidationTestDetails {
  filePath: string;
  docsUrl: string;
  policyNumber: string;
  policyLinkUrl: string;
  /**
   * Recommendation as per guideline
   */
  recommendation: string;
}
