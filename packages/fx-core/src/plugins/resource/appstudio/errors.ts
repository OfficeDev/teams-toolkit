// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "./constants";
import { getLocalizedString } from "../../../common/localizeUtils";

export class AppStudioError {
  public static readonly FileNotFoundError = {
    name: "FileNotFoundError",
    message: (filePath: string) =>
      getLocalizedString("error.appstudio.fileNotFoundError", filePath),
  };

  public static readonly NotADirectoryError = {
    name: "NotADirectory",
    message: (directoryPath: string) =>
      getLocalizedString("error.appstudio.notADirectoryError", directoryPath),
  };

  public static readonly RemoteAppIdCreateFailedError = {
    name: "RemoteAppIdCreateFailed",
    message: (error?: any) =>
      getLocalizedString("error.appstudio.remoteTeamsAppCreateFailed", error?.name, error?.message),
  };

  public static readonly RemoteAppIdUpdateFailedError = {
    name: "RemoteAppIdUpdateFailed",
    message: (error?: any) =>
      getLocalizedString("error.appstudio.remoteTeamsAppUpdateFailed", error?.name, error?.message),
  };

  public static readonly LocalAppIdCreateFailedError = {
    name: "LocalAppIdCreateFailed",
    message: (error?: any) =>
      getLocalizedString("error.appstudio.localTeamsAppCreateFailed", error?.name, error?.message),
  };

  public static readonly LocalAppIdUpdateFailedError = {
    name: "LocalAppIdUpdateFailed",
    message: (error?: any) =>
      getLocalizedString("error.appstudio.localTeamsAppUpdateFailed", error?.name, error?.message),
  };

  public static readonly TeamsAppCreateFailedError = {
    name: "TeamsAppCreateFailed",
    message: (error?: any) =>
      getLocalizedString("error.appstudio.teamsAppCreateFailed", error?.name, error?.message),
  };

  public static readonly TeamsAppUpdateFailedError = {
    name: "TeamsAppUpdateFailed",
    message: (teamsAppId: string) => `Failed to update Teams app with ID ${teamsAppId}.`,
  };

  public static readonly TeamsAppNotFoundError = {
    name: "TeamsAppNotFound",
    message: (appId: string) => getLocalizedString("error.appstudio.teamsAppNotFound", appId),
  };

  public static readonly InvalidManifestError = {
    name: "InvalidManifest",
    message: (error: any, key?: string) =>
      getLocalizedString("error.appstudio.invalidManifest", error, key),
  };

  public static readonly ManifestLoadFailedError = {
    name: "ManifestLoadFailed",
    message: (error: string) => getLocalizedString("error.appstudio.loadManifest", error),
  };

  public static readonly ValidationFailedError = {
    name: "ManifestValidationFailed",
    message: (errors: string[]) =>
      getLocalizedString("plugins.appstudio.validationFailedNotice") + errors.join("\n"),
  };

  public static readonly GetLocalDebugConfigFailedError = {
    name: "GetLocalDebugConfigFailed",
    message: (error: any) =>
      getLocalizedString("error.appstudio.getLocalConfigFailed", error.message),
  };

  public static readonly GetRemoteConfigFailedError = {
    name: "GetRemoteConfigFailed",
    message: (errorMessage: string, isProvisionSucceeded: boolean) =>
      getLocalizedString("error.appstudio.getRemoteConfigFailed", errorMessage) +
      `${isProvisionSucceeded ? "" : getLocalizedString("plugins.appstudio.provisionTip")}`,
  };

  public static readonly TeamsAppPublishFailedError = {
    name: "TeamsAppPublishFailed",
    message: (teamsAppId: string, correlationId?: string) =>
      getLocalizedString("error.appstudio.publishFailed", teamsAppId) +
      (correlationId ? `X-Correlation-ID: ${correlationId}` : ""),
  };

  public static readonly TeamsAppPublishCancelError = {
    name: "TeamsAppPublishCancelled",
    message: (name: string) => getLocalizedString("error.appstudio.publishCancelled", name),
  };

  public static readonly TeamsPackageBuildError = {
    name: "TeamsPackageBuildError",
    message: (error: any) =>
      error.message ? error.message : getLocalizedString("error.appstudio.buildError"),
  };

  public static readonly ScaffoldFailedError = {
    name: "ScaffoldFailed",
    message: (error: any) =>
      error.message ? error.message : getLocalizedString("error.appstudio.scaffoldFailed"),
  };

  public static readonly CheckPermissionFailedError = {
    name: "CheckPermissionFailed",
    message: (error: any) =>
      getLocalizedString("error.appstudio.checkPermissionFailed", error.message),
  };

  public static readonly GrantPermissionFailedError = {
    name: "GrantPermissionFailed",
    message: (errorMessage: string, id?: string) =>
      `${Constants.PERMISSIONS.name}: ${id}. ` +
      getLocalizedString("error.appstudio.grantPermissionFailed", errorMessage),
  };

  public static readonly ListCollaboratorFailedError = {
    name: "ListCollaboratorFailedError",
    message: (error: any) =>
      getLocalizedString("error.appstudio.listCollaboratorFailed", error.message),
  };

  public static readonly UpdateManifestCancelError = {
    name: "UpdateManifestCancelled",
    message: (name: string) => getLocalizedString("error.appstudio.updateManifestCancelled", name),
  };

  public static readonly UpdateManifestWithInvalidAppError = {
    name: "UpdateManifestWithInvalidAppError",
    message: (appId: string) =>
      getLocalizedString("error.appstudio.updateManifestInvalidApp", appId),
  };

  public static readonly InvalidCapabilityError = {
    name: "InvalidCapabilityError",
    message: (capability: string) =>
      getLocalizedString("error.appstudio.invalidCapability", capability),
  };

  public static readonly CapabilityExceedLimitError = {
    name: "CapabilityExceedLimitError",
    message: (capability: string) =>
      getLocalizedString("error.appstudio.capabilityExceedLimit", capability),
  };

  public static readonly StaticTabNotExistError = {
    name: "StaticTabNotExist",
    message: (index: string) => getLocalizedString("error.appstudio.staticTabNotExist", index),
  };

  public static readonly CapabilityNotExistError = {
    name: "CapabilityNotExist",
    message: (capability: string) =>
      getLocalizedString("error.appstudio.capabilityNotExist", capability),
  };
}
