// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { defaultHelpLink } from "@microsoft/teamsfx-core";
import { ExtensionErrors } from "../error";

export const openWenClientCommand = "launch Teams web client";
export const npmRunDevRegex = /npm[\s]+run[\s]+dev/im;

export const frontendProblemMatcher = "$teamsfx-frontend-watch";
export const backendProblemMatcher = "$teamsfx-backend-watch";
export const authProblemMatcher = "$teamsfx-auth-watch";
export const ngrokProblemMatcher = "$teamsfx-ngrok-watch";
export const botProblemMatcher = "$teamsfx-bot-watch";
export const tscWatchProblemMatcher = "$tsc-watch";

export const localSettingsJsonName = "localSettings.json";

export const frontendLocalEnvPrefix = "FRONTEND_";
export const backendLocalEnvPrefix = "BACKEND_";
export const authLocalEnvPrefix = "AUTH_";
export const authServicePathEnvKey = "AUTH_SERVICE_PATH";
export const botLocalEnvPrefix = "BOT_";

export const issueChooseLink = "https://github.com/OfficeDev/TeamsFx/issues/new/choose";
export const issueLink = "https://github.com/OfficeDev/TeamsFx/issues/new?";
export const issueTemplate = `
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**VS Code Extension Information (please complete the following information):**
 - OS: [e.g. iOS]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
`;
export const errorDetail = `
**Error detail**
`;

export enum PortWarningStateKeys {
  DoNotShowAgain = "localDebugPortWarning/doNotShowAgain",
}

export const localDebugHelpDoc = "https://aka.ms/teamsfx-localdebug";
export const portInUseHelpLink = "https://aka.ms/teamsfx-port-in-use";
export const skipNgrokHelpLink = "https://aka.ms/teamsfx-skip-ngrok";
export const trustDevCertHelpLink = "https://aka.ms/teamsfx-trust-dev-cert";
export const m365AppsPrerequisitesHelpLink = "https://aka.ms/teamsfx-m365-apps-prerequisites";

export const skipNgrokRetiredNotification =
  "Property 'skipNgrok' in '.fx/configs/localSettings.json' has been retired. Use 'fx-extension.prerequisiteCheck.ngrok' in VSCode settings instead.";
export const trustDevCertRetiredNotification =
  "Property 'trustDevCert' in '.fx/configs/localSettings.json' has been retired. Use 'fx-extension.prerequisiteCheck.devCert' in VSCode settings instead.";

export enum Hub {
  teams = "Teams",
  outlook = "Outlook",
  office = "Office",
}

export enum Host {
  teams = "teams.microsoft.com",
  outlook = "outlook.office.com",
  office = "www.office.com",
}

export class LaunchUrl {
  public static readonly teams: string =
    "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
  public static readonly outlookTab: string =
    "https://outlook.office.com/host/${teamsAppInternalId}?${account-hint}";
  public static readonly outlookBot: string = "https://outlook.office.com/mail?${account-hint}";
  public static readonly officeTab: string =
    "https://www.office.com/m365apps/${teamsAppInternalId}?auth=2&${account-hint}";
}

export const teamsAppIdPlaceholder = "${teamsAppId}";
export const teamsAppInternalIdPlaceholder = "${teamsAppInternalId}";
export const accountHintPlaceholder = "${account-hint}";

export const openOutputPanelCommand = "command:fx-extension.showOutputChannel";
export const openTerminalCommand = "command:workbench.action.terminal.focus";

export type DisplayMessages = {
  taskName: string;
  check: string;
  checkNumber: string;
  summary: string;
  learnMore: string;
  learnMoreHelpLink: string;
  launchServices: string;
  errorName: string;
  errorMessageKey: string;
  errorDisplayMessageKey: string;
  errorMessageLink: string;
  errorHelpLink: string;
  errorMessageCommand: string;
};

export const prerequisiteCheckDisplayMessages: DisplayMessages = {
  taskName: "Prerequisites Check",
  check:
    "Teams Toolkit is checking if all required prerequisites are installed and will install them if not. A summary will be generated for your reference.",
  checkNumber: "We are checking total @number of prerequisites for you.",
  summary: "Prerequisites Check Summary:",
  learnMore: "Visit @Link to learn more about prerequisites check.",
  learnMoreHelpLink: defaultHelpLink,
  launchServices:
    "Services will be launched locally, please check your terminal window for details.",
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorMessageCommand: openOutputPanelCommand,
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-envchecker-help",
};

export const npmInstallDisplayMessages: DisplayMessages = {
  taskName: "NPM Package Install",
  check:
    "Teams Toolkit is checking if all the NPM packages are installed and will install them if not. A summary will be generated for your reference.",
  checkNumber: "We are checking total @number of projects for you.",
  summary: "NPM Package Installation Summary:",
  learnMore: "Visit @Link to learn more about NPM package install task.",
  learnMoreHelpLink: "https://aka.ms/teamsfx-npm-package-task", // TODO: update npm install help link
  launchServices: "",
  errorName: ExtensionErrors.PrerequisitesInstallPackagesError,
  errorMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  errorMessageCommand: openTerminalCommand,
  errorMessageLink: "teamstoolkit.localDebug.terminal",
  errorHelpLink: "https://aka.ms/teamsfx-npm-package-task", // TODO: update npm install help link
};
