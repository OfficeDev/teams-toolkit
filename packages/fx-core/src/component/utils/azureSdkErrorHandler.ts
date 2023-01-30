// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { RestError } from "@azure/storage-blob";
import { DeployExternalApiCallError } from "../error/deployError";
import { HttpStatusCode } from "../constant/commonConstant";
import { BaseComponentInnerError } from "../error/componentError";

export function isAzureRestError(error: any): error is RestError {
  return error instanceof RestError || error.hasOwnProperty("statusCode");
}

export function isAzureRemoteServerError(error: any): boolean {
  return (
    isAzureRestError(error) &&
    (error?.statusCode ?? HttpStatusCode.ACCEPTED) >= HttpStatusCode.INTERNAL_SERVER_ERROR
  );
}

export function wrapAzureOperation<T>(
  operation: () => Promise<T>,
  remoteErrorHandler: (e: RestError) => DeployExternalApiCallError,
  otherErrorHandler: (e: unknown) => BaseComponentInnerError
): Promise<T> {
  return operation().catch((error) => {
    if (isAzureRemoteServerError(error)) {
      throw remoteErrorHandler(error);
    }
    throw otherErrorHandler(error);
  });
}
