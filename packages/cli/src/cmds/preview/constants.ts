// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

export enum Browser {
  chrome = "chrome",
  edge = "edge",
  default = "default",
}

export const sideloadingUrl =
  "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
export const teamsAppIdPlaceholder = "${teamsAppId}";
export const accountHintPlaceholder = "${account-hint}";

export const serviceLogHintMessage = "A complete log of this task can be found in:";
export const waitCtrlPlusC =
  "WARN: Closing browser will not terminate the preview process, please press Ctrl+C to terminate.";

export const localEnvFileName = "local.env";

export const frontendHostingPluginName = "fx-resource-frontend-hosting";
export const functionPluginName = "fx-resource-function";
export const botPluginName = "fx-resource-bot";
export const localDebugPluginName = "fx-resource-local-debug";
export const solutionPluginName = "solution";
export const spfxPluginName = "fx-resource-spfx";

export enum ProgrammingLanguage {
  javascript = "javascript",
  typescript = "typescript",
}

export const programmingLanguageConfigKey = "programmingLanguage";
export const skipNgrokConfigKey = "skipNgrok";
export const teamsAppTenantIdConfigKey = "teamsAppTenantId";
export const remoteTeamsAppIdConfigKey = "remoteTeamsAppId";
export const localTeamsAppIdConfigKey = "localDebugTeamsAppId";

export const frontendFolderName = "tabs";
export const backendFolderName = "api";
export const botFolderName = "bot";

export const npmInstallCommand = "npm install";
export const frontendStartCommand = "npx react-scripts start";
export const backendStartJsCommand = `npx func start --javascript --port "7071" --cors "*"`; // TODO: dependency checker
export const backendStartTsCommand = `npx func start --typescript --port "7071" --cors "*"`; // TODO: dependency checker
export const backendWatchCommand = "npx tsc --watch";
export const authStartCommand = "dotnet Microsoft.TeamsFx.SimpleAuth.dll"; // TODO: dependency checker
export const ngrokStartCommand = "npx ngrok http 3978 --log=stdout";
export const botStartJsCommand = "npx nodemon --signal SIGINT index.js";
export const botStartTsCommand =
  "npx nodemon --exec node --signal SIGINT -r ts-node/register index.ts";
const backendExtensionsInstallCsprojPath = "extensions.csproj";
const backendExtensionsInstallOutputPath = "bin";
export const backendExtensionsInstallCommand = `dotnet build ${backendExtensionsInstallCsprojPath} -o ${backendExtensionsInstallOutputPath} --ignore-failed-sources`; // TODO: dependency checker

export const frontendStartPattern = /Compiled|Failed/g;
export const backendStartPattern =
  /Worker process started and initialized|Host lock lease acquired by instance ID/g;
export const backendWatchPattern = /.*/g;
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
export const backendExtensionsInstallTitle = "backend extensions install";
export const backendExtensionsInstallStartMessage = "install Azure Functions binding extensions.";
export const backendExtensionsInstallSuccessMessage = `${backendExtensionsInstallTitle} completed successfully.`;
export const backendStartTitle = "backend start";
export const backendStartStartMessage = `execute 'func start' under ${backendFolderName} folder.`;
export const backendStartSuccessMessage = `backend started successfully.`;
export const backendWatchTitle = "backend watch";
export const backendWatchStartMessage = `execute 'tsc --watch' under ${backendFolderName} folder.`;
export const backendWatchSuccessMessage = "backend watcher started successfully";

export const botInstallTitle = "bot npm install";
export const botInstallStartMessage = `execute 'npm install' under ${botFolderName} folder.`;
export const botInstallSuccessMessage = `${botInstallTitle} completed successfully.`;
export const botStartTitle = "bot start";
export const botStartStartMessage = "start bot.";
export const botStartSuccessMessage = `bot started successfully.`;

export const ngrokStartTitle = "ngrok start";
export const ngrokStartStartMessage = `execute 'ngrok http' under ${botFolderName} folder.`;
export const ngrokStartSuccessMessage = "ngrok started successfully.";

export const previewTitle = "preview";
export const previewStartMessage = "open Teams web client.";
export const previewSuccessMessage = "Teams web client opened successfully.";

export const frontendLocalEnvPrefix = "FRONTEND_";
export const backendLocalEnvPrefix = "BACKEND_";
export const authLocalEnvPrefix = "AUTH_";
export const authServicePathEnvKey = "AUTH_SERVICE_PATH";
export const botLocalEnvPrefix = "BOT_";

const allAddressIPv4 = "0.0.0.0";
const allAddressIPv6 = "::";
const loopbackAddressIPv4 = "127.0.0.1";
const loopbackAddressIPv6 = "::1";
const hosts = [allAddressIPv4, loopbackAddressIPv4, allAddressIPv6, loopbackAddressIPv6];

export const frontendPorts: [number, string[]][] = [
  [3000, hosts],
  [5000, hosts],
];
export const backendPorts: [number, string[]][] = [[7071, hosts]];
export const botPorts: [number, string[]][] = [[3978, hosts]];
