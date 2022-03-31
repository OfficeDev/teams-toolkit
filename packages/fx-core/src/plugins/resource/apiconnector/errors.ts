// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { getLocalizedString } from "../../../common/localizeUtils";
import { Constants } from "./constants";
export class ErrorMessage {
  public static readonly InvalidProjectError = {
    name: "InvalidProjectError",
    message: () =>
      getLocalizedString(`error.apiConnector.${ErrorMessage.InvalidProjectError.name}`),
  };
  public static readonly ApiConnectorInputError = {
    name: "ApiConnectorInputError",
    message: () =>
      getLocalizedString(`error.apiConnector.${ErrorMessage.ApiConnectorInputError.name}`),
  };

  public static readonly ApiConnectorPathError = {
    name: "ApiConnectorPathNotExistError",
    message: (pathName: string) =>
      getLocalizedString(`error.apiConnector.${ErrorMessage.ApiConnectorPathError.name}`, pathName),
  };

  public static readonly ApiConnectorFileCreateFailError = {
    name: "ApiConnectorCreateFileFail",
    message: (pathName: string) =>
      getLocalizedString(
        `error.apiConnector.${ErrorMessage.ApiConnectorFileCreateFailError.name}`,
        pathName
      ),
  };

  public static readonly ApiConnectorRouteError = {
    name: "ApiConnectorFunctionRouteError",
    message: (funcName: string) =>
      getLocalizedString(
        `error.apiConnector.${ErrorMessage.ApiConnectorRouteError.name}`,
        funcName
      ),
  };

  public static readonly SampleCodeCreateFailError = {
    name: "SampleCodeCreateFailError",
    message: (pathName: string, reason: string) =>
      getLocalizedString(
        `error.apiConnector.${ErrorMessage.SampleCodeCreateFailError.name}`,
        pathName,
        reason
      ),
  };

  public static readonly NoValidCompoentExistError = {
    name: "NoValidCompoentExistError",
    message: () =>
      getLocalizedString(`error.apiConnector.${ErrorMessage.NoValidCompoentExistError.name}`),
  };

  public static readonly NoActivePluginsExistError = {
    name: "NoActivePluginsExistError",
    message: () =>
      getLocalizedString(`error.apiConnector.${ErrorMessage.NoActivePluginsExistError.name}`),
  };

  public static readonly generateApiConFilesError = {
    name: "ScaffoldApiFilesError",
    message: (pathName: string, reason: string) =>
      getLocalizedString(
        `error.apiConnector.${ErrorMessage.generateApiConFilesError.name}`,
        pathName,
        reason
      ),
  };
}
