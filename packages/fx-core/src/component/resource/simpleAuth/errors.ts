// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export interface PluginError {
  name: string;
  message: (...args: string[]) => [string, string];
}

export const NoConfigError: PluginError = {
  name: "NoConfigError",
  message: (pluginId, configKey) => [
    getDefaultString("error.sa.NoConfigError", configKey, pluginId),
    getLocalizedString("error.sa.NoConfigError", configKey, pluginId),
  ],
};

export const UnauthenticatedError: PluginError = {
  name: "UnauthenticatedError",
  message: () => [
    getDefaultString("error.sa.UnauthenticatedError"),
    getLocalizedString("error.sa.UnauthenticatedError"),
  ],
};

export const CreateAppServicePlanError: PluginError = {
  name: "CreateAppServicePlanError",
  message: (message) => [
    getDefaultString("error.sa.CreateAppServicePlanError", message),
    getLocalizedString("error.sa.CreateAppServicePlanError", message),
  ],
};

export const FreeServerFarmsQuotaError: PluginError = {
  name: "FreeServerFarmsQuotaError",
  message: (message) => [
    getDefaultString("error.sa.FreeServerFarmsQuotaError", message),
    getLocalizedString("error.sa.FreeServerFarmsQuotaError", message),
  ],
};

export const MissingSubscriptionRegistrationError: PluginError = {
  name: "MissingSubscriptionRegistrationError",
  message: (message) => [
    getDefaultString("error.sa.MissingSubscriptionRegistrationError", message),
    getLocalizedString("error.sa.MissingSubscriptionRegistrationError", message),
  ],
};

export const CreateWebAppError: PluginError = {
  name: "CreateWebAppError",
  message: (message) => [
    getDefaultString("error.sa.CreateWebAppError", message),
    getLocalizedString("error.sa.CreateWebAppError", message),
  ],
};

export const ZipDeployError: PluginError = {
  name: "ZipDeployError",
  message: (message) => [
    getDefaultString("error.sa.ZipDeployError", message),
    getLocalizedString("error.sa.ZipDeployError", message),
  ],
};

export const UpdateApplicationSettingsError: PluginError = {
  name: "UpdateApplicationSettingsError",
  message: (message) => [
    getDefaultString("error.sa.UpdateApplicationSettingsError", message),
    getLocalizedString("error.sa.UpdateApplicationSettingsError", message),
  ],
};

export const UnhandledError: PluginError = {
  name: "UnhandledError",
  message: (message) => [
    getDefaultString("error.common.UnhandledError", message),
    getLocalizedString("error.common.UnhandledError", message),
  ],
};

export const EndpointInvalidError: PluginError = {
  name: "EndpointInvalidError",
  message: (endpoint, message) => [
    getDefaultString("error.sa.EndpointInvalidError", endpoint, message),
    getLocalizedString("error.sa.EndpointInvalidError", endpoint, message),
  ],
};

export const ZipDownloadError: PluginError = {
  name: "ZipDownloadError",
  message: (message) => [
    getDefaultString("error.sa.ZipDownloadError", message),
    getLocalizedString("error.sa.ZipDownloadError", message),
  ],
};

export const VersionFileNotExist: PluginError = {
  name: "VersionFileNotExist",
  message: (filePath?) => [
    getDefaultString("error.sa.VersionFileNotExist", filePath ?? "File not exist."),
    getLocalizedString("error.sa.VersionFileNotExist", filePath ?? "File not exist."),
  ],
};
