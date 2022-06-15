// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "./constants";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export class AppStudioError {
  public static readonly FileNotFoundError = {
    name: "FileNotFoundError",
    message: (filePath: string): [string, string] => [
      getDefaultString("error.appstudio.fileNotFoundError", filePath),
      getLocalizedString("error.appstudio.fileNotFoundError", filePath),
    ],
  };

  public static readonly NotADirectoryError = {
    name: "NotADirectory",
    message: (directoryPath: string): [string, string] => [
      getDefaultString("error.appstudio.notADirectoryError", directoryPath),
      getLocalizedString("error.appstudio.notADirectoryError", directoryPath),
    ],
  };

  public static readonly RemoteAppIdCreateFailedError = {
    name: "RemoteAppIdCreateFailed",
    message: (error?: any): [string, string] => [
      getDefaultString("error.appstudio.remoteTeamsAppCreateFailed", error?.name, error?.message),
      getLocalizedString("error.appstudio.remoteTeamsAppCreateFailed", error?.name, error?.message),
    ],
  };

  public static readonly RemoteAppIdUpdateFailedError = {
    name: "RemoteAppIdUpdateFailed",
    message: (error?: any): [string, string] => [
      getDefaultString("error.appstudio.remoteTeamsAppUpdateFailed", error?.name, error?.message),
      getLocalizedString("error.appstudio.remoteTeamsAppUpdateFailed", error?.name, error?.message),
    ],
  };

  public static readonly LocalAppIdCreateFailedError = {
    name: "LocalAppIdCreateFailed",
    message: (error?: any): [string, string] => [
      getDefaultString("error.appstudio.localTeamsAppCreateFailed", error?.name, error?.message),
      getLocalizedString("error.appstudio.localTeamsAppCreateFailed", error?.name, error?.message),
    ],
  };

  public static readonly LocalAppIdUpdateFailedError = {
    name: "LocalAppIdUpdateFailed",
    message: (error?: any): [string, string] => [
      getDefaultString("error.appstudio.localTeamsAppUpdateFailed", error?.name, error?.message),
      getLocalizedString("error.appstudio.localTeamsAppUpdateFailed", error?.name, error?.message),
    ],
  };

  public static readonly TeamsAppCreateFailedError = {
    name: "TeamsAppCreateFailed",
    message: (error?: any): [string, string] => [
      getDefaultString("error.appstudio.teamsAppCreateFailed", error?.name, error?.message),
      getLocalizedString("error.appstudio.teamsAppCreateFailed", error?.name, error?.message),
    ],
  };

  public static readonly TeamsAppUpdateFailedError = {
    name: "TeamsAppUpdateFailed",
    message: (teamsAppId: string): [string, string] => [
      getDefaultString("error.appstudio.teamsAppUpdateFailed", teamsAppId),
      getLocalizedString("error.appstudio.teamsAppUpdateFailed", teamsAppId),
    ],
  };

  public static readonly TeamsAppNotFoundError = {
    name: "TeamsAppNotFound",
    message: (appId: string): [string, string] => [
      getDefaultString("error.appstudio.teamsAppNotFound", appId),
      getLocalizedString("error.appstudio.teamsAppNotFound", appId),
    ],
  };

  public static readonly InvalidManifestError = {
    name: "InvalidManifest",
    message: (error: any, key?: string): [string, string] => [
      getDefaultString("error.appstudio.invalidManifest", error, key),
      getLocalizedString("error.appstudio.invalidManifest", error, key),
    ],
  };

  public static readonly ManifestLoadFailedError = {
    name: "ManifestLoadFailed",
    message: (error: string): [string, string] => [
      getDefaultString("error.appstudio.loadManifest", error),
      getLocalizedString("error.appstudio.loadManifest", error),
    ],
  };

  public static readonly ValidationFailedError = {
    name: "ManifestValidationFailed",
    message: (errors: string[]): [string, string] => [
      getDefaultString("plugins.appstudio.validationFailedNotice") + errors.join("\n"),
      getLocalizedString("plugins.appstudio.validationFailedNotice") + errors.join("\n"),
    ],
  };

  public static readonly GetLocalDebugConfigFailedError = {
    name: "GetLocalDebugConfigFailed",
    message: (error: any): [string, string] => [
      getDefaultString("error.appstudio.getLocalConfigFailed", error.message),
      getLocalizedString("error.appstudio.getLocalConfigFailed", error.message),
    ],
  };

  public static readonly GetRemoteConfigFailedError = {
    name: "GetRemoteConfigFailed",
    message: (errorMessage: string, isProvisionSucceeded: boolean): [string, string] => [
      getDefaultString("error.appstudio.getRemoteConfigFailed", errorMessage) +
        `${isProvisionSucceeded ? "" : getDefaultString("plugins.appstudio.provisionTip")}`,
      getLocalizedString("error.appstudio.getRemoteConfigFailed", errorMessage) +
        `${isProvisionSucceeded ? "" : getLocalizedString("plugins.appstudio.provisionTip")}`,
    ],
  };

  public static readonly TeamsAppPublishFailedError = {
    name: "TeamsAppPublishFailed",
    message: (
      teamsAppId: string,
      requestPath: string,
      correlationId?: string
    ): [string, string] => [
      getDefaultString("error.appstudio.publishFailed", teamsAppId) +
        `Request path: ${requestPath}` +
        (correlationId ? `X-Correlation-ID: ${correlationId}` : ""),
      getLocalizedString("error.appstudio.publishFailed", teamsAppId) +
        `Request path: ${requestPath}` +
        (correlationId ? `X-Correlation-ID: ${correlationId}` : ""),
    ],
  };

  public static readonly TeamsAppPublishCancelError = {
    name: "TeamsAppPublishCancelled",
    message: (name: string): [string, string] => [
      getDefaultString("error.appstudio.publishCancelled", name),
      getLocalizedString("error.appstudio.publishCancelled", name),
    ],
  };

  public static readonly TeamsPackageBuildError = {
    name: "TeamsPackageBuildError",
    message: (error: any): [string, string] => [
      error.message ?? getDefaultString("error.appstudio.buildError"),
      error.displayMessage ?? getLocalizedString("error.appstudio.buildError"),
    ],
  };

  public static readonly ScaffoldFailedError = {
    name: "ScaffoldFailed",
    message: (error: any): [string, string] => [
      error.message ?? getDefaultString("error.appstudio.scaffoldFailed"),
      error.displayMessage ?? getLocalizedString("error.appstudio.scaffoldFailed"),
    ],
  };

  public static readonly CheckPermissionFailedError = {
    name: "CheckPermissionFailed",
    message: (error: any): [string, string] => [
      getDefaultString("error.appstudio.checkPermissionFailed", error.message),
      getLocalizedString("error.appstudio.checkPermissionFailed", error.message),
    ],
  };

  public static readonly GrantPermissionFailedError = {
    name: "GrantPermissionFailed",
    message: (errorMessage: string, id?: string): [string, string] => [
      `${Constants.PERMISSIONS.name}: ${id}. ` +
        getDefaultString("error.appstudio.grantPermissionFailed", errorMessage),
      `${Constants.PERMISSIONS.name}: ${id}. ` +
        getLocalizedString("error.appstudio.grantPermissionFailed", errorMessage),
    ],
  };

  public static readonly ListCollaboratorFailedError = {
    name: "ListCollaboratorFailedError",
    message: (error: any): [string, string] => [
      getDefaultString("error.appstudio.listCollaboratorFailed", error.message),
      getLocalizedString("error.appstudio.listCollaboratorFailed", error.message),
    ],
  };

  public static readonly UpdateManifestCancelError = {
    name: "UpdateManifestCancelled",
    message: (name: string): [string, string] => [
      getDefaultString("error.appstudio.updateManifestCancelled", name),
      getLocalizedString("error.appstudio.updateManifestCancelled", name),
    ],
  };

  public static readonly UpdateManifestWithInvalidAppError = {
    name: "UpdateManifestWithInvalidAppError",
    message: (appId: string): [string, string] => [
      getDefaultString("error.appstudio.updateManifestInvalidApp", appId),
      getLocalizedString("error.appstudio.updateManifestInvalidApp", appId),
    ],
  };

  public static readonly InvalidCapabilityError = {
    name: "InvalidCapabilityError",
    message: (capability: string): [string, string] => [
      getDefaultString("error.appstudio.invalidCapability", capability),
      getLocalizedString("error.appstudio.invalidCapability", capability),
    ],
  };

  public static readonly CapabilityExceedLimitError = {
    name: "CapabilityExceedLimitError",
    message: (capability: string): [string, string] => [
      getDefaultString("error.appstudio.capabilityExceedLimit", capability),
      getLocalizedString("error.appstudio.capabilityExceedLimit", capability),
    ],
  };

  public static readonly StaticTabNotExistError = {
    name: "StaticTabNotExist",
    message: (index: string): [string, string] => [
      getDefaultString("error.appstudio.staticTabNotExist", index),
      getLocalizedString("error.appstudio.staticTabNotExist", index),
    ],
  };

  public static readonly CapabilityNotExistError = {
    name: "CapabilityNotExist",
    message: (capability: string): [string, string] => [
      getDefaultString("error.appstudio.capabilityNotExist", capability),
      getLocalizedString("error.appstudio.capabilityNotExist", capability),
    ],
  };
}
