// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { getLocalizedString } from "../../../common/localizeUtils";
import { Constants } from "./constants";
export class ErrorMessage {
  public static readonly InvalidProjectError = {
    name: "InvalidProjectError",
    message: () =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.InvalidProjectError.name}`
      ),
  };
  public static readonly ApiConnectorInputError = {
    name: "ApiConnectorInputError",
    message: () =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.ApiConnectorInputError.name}`
      ),
  };

  public static readonly ApiConnectorPathError = {
    name: "ApiConnectorPathNotExistError",
    message: (pathName: string) =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.ApiConnectorPathError.name}`,
        pathName
      ),
  };

  public static readonly ApiConnectorFileCreateFailError = {
    name: "ApiConnectorCreateFileFail",
    message: (pathName: string) =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.ApiConnectorFileCreateFailError.name}`,
        pathName
      ),
  };

  public static readonly ApiConnectorRouteError = {
    name: "ApiConnectorFunctionRouteError",
    message: (funcName: string) =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.ApiConnectorRouteError.name}`,
        funcName
      ),
  };

  public static readonly ApiConnectorSampleCodeCreateFailError = {
    name: "ApiConnectorSampleCodeCreateFailError",
    message: (pathName: string, reason: string) =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.ApiConnectorSampleCodeCreateFailError.name}`,
        pathName,
        reason
      ),
  };

  public static readonly NoValidCompoentExistError = {
    name: "NoValidCompoentExistError",
    message: () =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.NoValidCompoentExistError.name}`
      ),
  };

  public static readonly NoActivePluginsExistError = {
    name: "NoActivePluginsExistError",
    message: () =>
      getLocalizedString(
        `plugins.apiConnector.errorMessage.${ErrorMessage.NoActivePluginsExistError.name}`
      ),
  };
}
