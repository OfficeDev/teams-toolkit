// Copyright (c) Microsoft Corporation.

import { getLocalizedString } from "../../../common/localizeUtils";

// Licensed under the MIT license.
export interface PluginError {
  name: string;
  message: (...args: string[]) => string;
}

export const NoConfigError: PluginError = {
  name: "NoConfigError",
  message: (pluginId, configKey) =>
    getLocalizedString("error.sa.NoConfigError", configKey, pluginId),
};

export const UnauthenticatedError: PluginError = {
  name: "UnauthenticatedError",
  message: () => getLocalizedString("error.sa.UnauthenticatedError"),
};

export const CreateAppServicePlanError: PluginError = {
  name: "CreateAppServicePlanError",
  message: (message) => getLocalizedString("error.sa.CreateAppServicePlanError", message),
};

export const FreeServerFarmsQuotaError: PluginError = {
  name: "FreeServerFarmsQuotaError",
  message: (message) => getLocalizedString("error.sa.FreeServerFarmsQuotaError", message),
};

export const MissingSubscriptionRegistrationError: PluginError = {
  name: "MissingSubscriptionRegistrationError",
  message: (message) =>
    getLocalizedString("error.sa.MissingSubscriptionRegistrationError", message),
};

export const CreateWebAppError: PluginError = {
  name: "CreateWebAppError",
  message: (message) => getLocalizedString("error.sa.CreateWebAppError", message),
};

export const ZipDeployError: PluginError = {
  name: "ZipDeployError",
  message: (message) => getLocalizedString("error.sa.ZipDeployError", message),
};

export const UpdateApplicationSettingsError: PluginError = {
  name: "UpdateApplicationSettingsError",
  message: (message) => getLocalizedString("error.sa.UpdateApplicationSettingsError", message),
};

export const UnhandledError: PluginError = {
  name: "UnhandledError",
  message: (message) => getLocalizedString("error.sa.UnhandledError", message),
};

export const EndpointInvalidError: PluginError = {
  name: "EndpointInvalidError",
  message: (endpoint, message) =>
    getLocalizedString("error.sa.EndpointInvalidError", endpoint, message),
};

export const ZipDownloadError: PluginError = {
  name: "ZipDownloadError",
  message: (message) => getLocalizedString("error.sa.ZipDownloadError", message),
};

export const VersionFileNotExist: PluginError = {
  name: "VersionFileNotExist",
  message: (filePath?) =>
    getLocalizedString("error.sa.VersionFileNotExist", filePath ?? "File not exist."),
};
