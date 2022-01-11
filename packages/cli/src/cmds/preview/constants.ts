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

export const serviceLogHintMessage = "The log of this task can be found in:";
export const openBrowserHintMessage =
  "WARN: Failed to open the browser, please copy the preview url and paste it into your browser.";
export const waitCtrlPlusC =
  "WARN: Closing browser will not terminate the preview process, please press Ctrl+C to terminate.";

export const localEnvFileName = "local.env";

export const frontendHostingPluginName = "fx-resource-frontend-hosting";
export const functionPluginName = "fx-resource-function";
export const botPluginName = "fx-resource-bot";
export const localDebugPluginName = "fx-resource-local-debug";
export const solutionPluginName = "solution";
export const appstudioPluginName = "fx-resource-appstudio";
export const spfxPluginName = "fx-resource-spfx";

export enum ProgrammingLanguage {
  javascript = "javascript",
  typescript = "typescript",
}

export const programmingLanguageConfigKey = "programmingLanguage";
export const skipNgrokConfigKey = "skipNgrok";
export const teamsAppTenantIdConfigKey = "teamsAppTenantId";
export const remoteTeamsAppIdConfigKey = "remoteTeamsAppId";
export const remoteTeamsAppIdConfigKeyNew = "teamsAppId";
export const localTeamsAppIdConfigKey = "localDebugTeamsAppId";

export const localSettingsTenantIdConfigKey = "tenantId";
export const localSettingsTeamsAppIdConfigKey = "teamsAppId";

export const spfxFolderName = "SPFx";
export const frontendFolderName = "tabs";
export const backendFolderName = "api";
export const botFolderName = "bot";

export const npmInstallCommand = "npm install --no-audit";
export const nodeCommand = "node";
export const frontendStartCommand = "npx react-scripts start";
export const backendStartJsCommand = `@command start --javascript --port "7071" --cors "*"`;
export const backendStartTsCommand = `@command start --typescript --port "7071" --cors "*"`;
export const backendWatchCommand = "npx tsc --watch";
export const ngrokStartCommand = "npx ngrok http 3978 --log=stdout";
export const botStartJsCommand = "npx nodemon --signal SIGINT index.js";
export const botStartTsCommand =
  "npx nodemon --exec node --signal SIGINT -r ts-node/register index.ts";

export const frontendStartPattern = /Compiled|Failed/g;
export const backendStartPattern =
  /Worker process started and initialized|Host lock lease acquired by instance ID/g;
export const backendWatchPattern = /.*/g;
export const authStartPattern = /.*/g;
export const ngrokStartPattern = /started tunnel|failed to reconnect session/g;
export const botStartPattern = /listening|[nodemon] app crashed/g;
export const gulpServePattern = /^.*Finished subtask 'reload'.*/g;

export const spfxInstallTitle = "spfx npm install";
export const spfxInstallStartMessage = `executing 'npm install' under ${spfxFolderName} folder.`;
export const gulpCertTitle = "gulp trust-dev-cert";
export const gulpCertStartMessage = `executing 'gulp trust-dev-cert' under ${spfxFolderName} folder.`;
export const gulpServeTitle = "gulp serve";
export const gulpServeStartMessage = `executing 'gulp serve' under ${spfxFolderName} folder.`;
export const frontendInstallTitle = "frontend npm install";
export const frontendInstallStartMessage = `executing 'npm install' under ${frontendFolderName} folder.`;
export const frontendStartTitle = "frontend start";
export const frontendStartStartMessage = `executing 'react-scripts start' under ${frontendFolderName} folder.`;

export const authStartTitle = "auth start";
export const authStartStartMessage = "starting auth service.";

export const backendInstallTitle = "backend npm install";
export const backendInstallStartMessage = `executing 'npm install' under ${backendFolderName} folder.`;
export const backendExtensionsInstallTitle = "backend extensions install";
export const backendExtensionsInstallStartMessage =
  "installing Azure Functions binding extensions.";
export const backendStartTitle = "backend start";
export const backendStartStartMessage = `executing 'func start' under ${backendFolderName} folder.`;
export const backendWatchTitle = "backend watch";
export const backendWatchStartMessage = `executing 'tsc --watch' under ${backendFolderName} folder.`;

export const botInstallTitle = "bot npm install";
export const botInstallStartMessage = `executing 'npm install' under ${botFolderName} folder.`;
export const botStartTitle = "bot start";
export const botStartStartMessage = "starting bot.";

export const ngrokStartTitle = "ngrok start";
export const ngrokStartStartMessage = `executing 'ngrok http' under ${botFolderName} folder.`;

export const previewTitle = "preview";
export const previewStartMessage = "opening Teams web client.";
export const previewSPFxTitle = "spfx preview";
export const previewSPFxStartMessage = "opening SharePoint workbench.";

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
  [53000, hosts],
  [55000, hosts],
];
export const backendPorts: [number, string[]][] = [[7071, hosts]];
export const botPorts: [number, string[]][] = [[3978, hosts]];
