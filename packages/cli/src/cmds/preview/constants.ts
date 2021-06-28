// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

export const sideloadingUrl =
  "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
export const teamsAppIdPlaceholder = "${teamsAppId}";
export const accountHintPlaceholder = "${account-hint}";

export const waitCtrlPlusC = "Press Ctrl+C to stop preview.";

export const localEnvFileName = "local.env";

export const frontendHostingPluginName = "fx-resource-frontend-hosting";
export const functionPluginName = "fx-resource-function";
export const botPluginName = "fx-resource-bot";
export const localDebugPluginName = "fx-resource-local-debug";
export const solutionPluginName = "solution";

export const skipNgrokConfigKey = "skipNgrok";
export const teamsAppTenantId = "teamsAppTenantId";
export const remoteTeamsAppIdConfigKey = "remoteTeamsAppId";
export const localTeamsAppIdConfigKey = "localDebugTeamsAppId";

export const frontendFolderName = "tabs";
export const backendFolderName = "api";
export const botFolderName = "bot";

export const npmInstallCommand = "npm install";
export const frontendStartCommand = "npx react-scripts start";
export const backendStartJsCommand = `npx func start --javascript --language-worker="--inspect=9229" --port "7071" --cors "*"`;
export const authStartCommand = "dotnet Microsoft.TeamsFx.SimpleAuth.dll";
export const ngrokStartCommand = "npx ngrok http 3978 --log=stdout";
export const botStartJsCommand = "npx nodemon --inspect=9239 --signal SIGINT index.js";

export const frontendStartPattern = /Compiled|Failed/g;
export const backendStartPattern =
  /Worker process started and initialized|Host lock lease acquired by instance ID/g;
export const authStartPattern = /.*/g;
export const ngrokStartPattern = /started tunnel|failed to reconnect session/g;
export const botStartPattern = /listening|[nodemon] app crashed/g;

export const frontendInstallTitle = "frontend npm install";
export const frontendInstallStartMessage = `execute 'npm install' under ${frontendFolderName} folder.`;
export const frontendInstallSuccessMessage = `${frontendInstallTitle} completed successfully.`;
export const frontendStartTitle = "frontend start";
export const frontendStartStartMessage = `execute 'react-scripts start' under ${frontendFolderName} folder.`;
export const frontendStartSuccessMessage = "frontend started successfully.";

export const authStartTitle = "auth start";
export const authStartStartMessage = "start auth service.";
export const authStartSuccessMessage = `auth service started successfully.`;

export const backendInstallTitle = "backend npm install";
export const backendInstallStartMessage = `execute 'npm install' under ${backendFolderName} folder.`;
export const backendInstallSuccessMessage = `${backendInstallTitle} completed successfully.`;
export const backendStartTitle = "backend start";
export const backendStartStartMessage = `execute 'func start' under ${backendFolderName} folder.`;
export const backendStartSuccessMessage = `backend started successfully.`;

export const botInstallTitle = "bot npm install";
export const botInstallStartMessage = `execute 'npm install' under ${botFolderName} folder.`;
export const botInstallSuccessMessage = `${botInstallTitle} completed successfully.`;
export const botStartTitle = "bot start";
export const botStartStartMessage = "start bot.";
export const botStartSuccessMessage = `bot started successfully.`;

export const ngrokStartTitle = "ngrok start";
export const ngrokStartStartMessage = `execute 'ngrok http' under ${botFolderName} folder.`;
export const ngrokStartSuccessMessage = "ngrok started successfully.";

export const sideloadingTitle = "sideloading";
export const sideloadingStartMessage = "open Teams web client: ";
export const sideloadingSuccessMessage = "Teams web client opened successfully.";

export const frontendLocalEnvPrefix = "FRONTEND_";
export const backendLocalEnvPrefix = "BACKEND_";
export const authLocalEnvPrefix = "AUTH_";
export const authServicePathEnvKey = "AUTH_SERVICE_PATH";
export const botLocalEnvPrefix = "BOT_";
