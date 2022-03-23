// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { FolderName } from "@microsoft/teamsfx-core";

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

export const frontendHostingPluginName = "fx-resource-frontend-hosting";
export const functionPluginName = "fx-resource-function";
export const botPluginName = "fx-resource-bot";
export const solutionPluginName = "solution";
export const appstudioPluginName = "fx-resource-appstudio";
export const spfxPluginName = "fx-resource-spfx";

export const teamsAppTenantIdConfigKey = "teamsAppTenantId";
export const remoteTeamsAppIdConfigKey = "teamsAppId";

export const frontendStartPattern = /Compiled|Failed/g;
export const backendStartPattern =
  /Worker process started and initialized|Host lock lease acquired by instance ID/g;
// From vscode $tsc-watch problem matcher: https://github.com/microsoft/vscode/blob/5a0ab56492d0c99f08028ca62ac3d59edb37f30f/extensions/typescript-language-features/package.json#L1085
export const tscWatchPattern =
  /^\s*(?:message TS6042:|\[?\D*\d{1,2}[:.]\d{1,2}[:.]\d{1,2}\D*(├\D*\d{1,2}\D+┤)?(?:\]| -)) (?:Compilation complete\.|Found \d+ errors?\.) Watching for file changes\./g;
// make a copy to prevent accidental change
export const backendWatchPattern = new RegExp(tscWatchPattern);
export const funcHostedBotWatchPattern = new RegExp(tscWatchPattern);
export const authStartPattern = /.*/g;
export const ngrokStartPattern = /started tunnel|failed to reconnect session/g;
export const botStartPattern = /listening|[nodemon] app crashed/g;
export const funcHostedBotStartPattern =
  /Worker process started and initialized|Host lock lease acquired by instance ID/g;
export const funcHostedBotAzuritePattern = /successfully listening/g;
export const gulpServePattern = /^.*Finished subtask 'reload'.*/g;

export const spfxInstallStartMessage = `executing 'npm install' under ${FolderName.SPFx} folder.`;
export const gulpCertTitle = "gulp trust-dev-cert";
export const gulpCertStartMessage = `executing 'gulp trust-dev-cert' under ${FolderName.SPFx} folder.`;
export const gulpServeTitle = "gulp serve";
export const gulpServeStartMessage = `executing 'gulp serve' under ${FolderName.SPFx} folder.`;
export const frontendInstallStartMessage = `executing 'npm install' under ${FolderName.Frontend} folder.`;
export const frontendStartStartMessage = `executing 'react-scripts start' under ${FolderName.Frontend} folder.`;
export const frontendStartStartMessageNext = `executing 'npm run dev:teamsfx' under ${FolderName.Frontend} folder.`;
export const authStartStartMessage = "starting auth service.";
export const backendInstallStartMessage = `executing 'npm install' under ${FolderName.Function} folder.`;
export const backendExtensionsInstallStartMessage =
  "installing Azure Functions binding extensions.";
export const backendStartStartMessage = `executing 'func start' under ${FolderName.Function} folder.`;
export const backendStartStartMessageNext = `executing 'npm run dev:teamsfx' under ${FolderName.Function} folder.`;
export const backendWatchStartMessage = `executing 'tsc --watch' under ${FolderName.Function} folder.`;
export const backendWatchStartMessageNext = `executing 'npm run watch:teamsfx' under ${FolderName.Function} folder.`;
export const botInstallStartMessage = `executing 'npm install' under ${FolderName.Bot} folder.`;
export const botStartStartMessage = "starting bot.";
export const botStartStartMessageNext = `executing 'npm run dev:teamsfx' under ${FolderName.Bot} folder.`;
export const botWatchStartMessage = `executing 'npm run watch:teamsfx' under ${FolderName.Bot} folder.`;
export const botAzuriteStartMessage = `executing 'npm run prepare-storage:teamsfx' under ${FolderName.Bot} folder.`;
export const ngrokStartStartMessage = `executing 'ngrok http' under ${FolderName.Bot} folder.`;

export const previewTitle = "preview";
export const previewStartMessage = "opening Teams web client.";
export const previewSPFxTitle = "spfx preview";
export const previewSPFxStartMessage = "opening SharePoint workbench.";

export const frontendLocalEnvPrefix = "FRONTEND_";
export const backendLocalEnvPrefix = "BACKEND_";
export const authLocalEnvPrefix = "AUTH_";
export const authServicePathEnvKey = "AUTH_SERVICE_PATH";
export const botLocalEnvPrefix = "BOT_";

export const automaticNpmInstallHintMessage =
  'Automatically installing packages required for your project. You can disable this by setting the global config "automatic-npm-install" to "off".';

export const doctorResult = {
  NodeNotFound: `Cannot find Node.js.`,
  NodeNotSupported: `Node.js (@CurrentVersion) is not in the supported version list (@SupportedVersions).`,
  NodeSuccess: `Supported Node.js version (@Version) is installed`,
  InstallNode:
    "Go to https://nodejs.org/about/releases/ to install Node.js (recommended version v14)",
  SideLoadingDisabled:
    "Your M365 tenant admin hasn't enabled sideloading permission for your account. You can't install your app to Teams!",
  NotSignIn: "No M365 account login",
  SignInSuccess: `M365 Account (@account) is logged in and sideloading enabled`,
  SkipTrustingCert: "Skip trusting development certificate for localhost",
  HelpLink: `Please refer to @Link for more information.`,
};
