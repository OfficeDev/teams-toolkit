// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const ExtensionSource = "Ext";

export enum ExtensionErrors {
  UnknwonError = "UnknwonError",
  UnsupportedOperation = "UnsupportedOperation",
  UserCancel = "UserCancel",
  ConcurrentTriggerTask = "ConcurrentTriggerTask",
  EmptySelectOption = "EmptySelectOption",
  UnsupportedNodeType = "UnsupportedNodeType",
  UnknownSubscription = "UnknownSubscription",
  PortAlreadyInUse = "PortAlreadyInUse",
  OpenExternalFailed = "OpenExternalFailed",
  FolderAlreadyExist = "FolderAlreadyExist",
  InvalidProject = "InvalidProject",
  FetchSampleError = "FetchSampleError",
  EnvConfigNotFoundError = "EnvConfigNotFoundError",
  EnvStateNotFoundError = "EnvStateNotFoundError",
  EnvResourceInfoNotFoundError = "EnvResourceInfoNotFoundError",
  NoWorkspaceError = "NoWorkSpaceError",
  UpdatePackageJsonError = "UpdatePackageJsonError",
  UpdateManifestError = "UpdateManifestError",
  UpdateCodeError = "UpdateCodeError",
  UpdateCodesError = "UpdateCodesError",
  TeamsAppIdNotFoundError = "TeamsAppIdNotFoundError",
  GrantPermissionNotLoginError = "GrantPermissionNotLoginError",
  GrantPermissionNotProvisionError = "GrantPermissionNotProvisionError",
}
