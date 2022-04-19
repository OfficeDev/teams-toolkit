// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { ApiConnectionMsg } from "./result";
export class ErrorMessage {
  public static getMessages(key: string, ...params: any[]): ApiConnectionMsg {
    return {
      defaultMsg: getDefaultString(key, ...params),
      localizedMsg: getLocalizedString(key, ...params),
    };
  }
  public static readonly InvalidProjectError = {
    name: "InvalidProjectError",
    message: (): ApiConnectionMsg =>
      ErrorMessage.getMessages(`error.apiConnector.${ErrorMessage.InvalidProjectError.name}`),
  };
  public static readonly ApiConnectorInputError = {
    name: "ApiConnectorInputError",
    message: (key: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.ApiConnectorInputError.name}`,
        key
      ),
  };

  public static readonly ApiConnectorPathError = {
    name: "ApiConnectorPathNotExistError",
    message: (pathName: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.ApiConnectorPathError.name}`,
        pathName
      ),
  };

  public static readonly ApiConnectorFileCreateFailError = {
    name: "ApiConnectorCreateFileFail",
    message: (pathName: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.ApiConnectorFileCreateFailError.name}`,
        pathName
      ),
  };

  public static readonly ApiConnectorRouteError = {
    name: "ApiConnectorFunctionRouteError",
    message: (funcName: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.ApiConnectorRouteError.name}`,
        funcName
      ),
  };

  public static readonly SampleCodeCreateFailError = {
    name: "SampleCodeCreateFailError",
    message: (pathName: string, reason: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.SampleCodeCreateFailError.name}`,
        pathName,
        reason
      ),
  };

  public static readonly NoValidCompoentExistError = {
    name: "NoBotOrFunctionExistError",
    message: (): ApiConnectionMsg =>
      ErrorMessage.getMessages(`error.apiConnector.${ErrorMessage.NoValidCompoentExistError.name}`),
  };

  public static readonly NoActivePluginsExistError = {
    name: "NoActivePluginsExistError",
    message: (): ApiConnectionMsg =>
      ErrorMessage.getMessages(`error.apiConnector.${ErrorMessage.NoActivePluginsExistError.name}`),
  };

  public static readonly generateApiConFilesError = {
    name: "ScaffoldApiFilesError",
    message: (reason: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.generateApiConFilesError.name}`,
        reason
      ),
  };

  public static readonly sdkVersionImcompatibleError = {
    name: "SDKVersionImcompatibleError",
    message: (component: string, localVersion: string, targetVersion: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.sdkVersionImcompatibleError.name}`,
        component,
        localVersion,
        targetVersion
      ),
  };

  public static readonly localPkgFileNotExistError = {
    name: "pkgFileNotExistError",
    message: (component: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.localPkgFileNotExistError.name}`,
        component
      ),
  };

  public static readonly componentNotExistError = {
    name: "componentNotExistError",
    message: (component: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(
        `error.apiConnector.${ErrorMessage.componentNotExistError.name}`,
        component
      ),
  };

  public static readonly envVarExistError = {
    name: "envVarExistError",
    message: (varName: string): ApiConnectionMsg =>
      ErrorMessage.getMessages(`error.apiConnector.${ErrorMessage.envVarExistError.name}`, varName),
  };
}
