// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { getLocalizedString } from "../../../common/localizeUtils";
import { Constants } from "./constants";
export class ErrorMessage {
  public static readonly ApiConnectorInputError = {
    name: "ApiConnectorInputError",
    message: () =>
      getLocalizedString(
        `plugins.apiconnector.errorMessage.${ErrorMessage.ApiConnectorInputError.name}`
      ),
  };

  public static readonly ApiConnectorPathError = {
    name: "ApiConnectorPathNotExistError",
    message: (pathName: string) =>
      getLocalizedString(
        `plugins.apiconnector.errorMessage.${ErrorMessage.ApiConnectorPathError.name}`,
        pathName
      ),
  };

  public static readonly ApiConnectorFileCreateFailError = {
    name: "ApiConnectorCreateFileFail",
    message: (pathName: string) =>
      getLocalizedString(
        `plugins.apiconnector.errorMessage.${ErrorMessage.ApiConnectorFileCreateFailError.name}`,
        pathName
      ),
  };
}
