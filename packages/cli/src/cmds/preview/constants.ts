// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

export const settingsFileName = "settings.json";

export const frontendHostingPluginName = "fx-resource-frontend-hosting";
export const functionPluginName = "fx-resource-function";
export const botPluginName = "fx-resource-bot";

export const frontendFolderName = "tabs";
export const backendFolderName = "api";
export const botFolderName = "bot";

export const npmInstallCommand = "npm install";


export const frontendInstallTitle = "frontend npm install";
export const frontendInstallStartMessage = `Execute 'npm install' under ${frontendFolderName} folder.`;
export const frontendInstallSuccessMessage = `${frontendInstallTitle} completed successfully.`;

export const backendInstallTitle = "backend npm install";
export const backendInstallStartMessage = `Execute 'npm install' under ${backendFolderName} folder.`;
export const backendInstallSuccessMessage = `${backendInstallTitle} completed successfully.`;
