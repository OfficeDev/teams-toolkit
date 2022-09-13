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

export const localTunnelDisplayMessages = Object.freeze({
  taskName: "Local Tunnel Service",
  check:
    "Teams Toolkit is starting the local tunnel service. It will tunnel local ports to public URLs and inspect traffic. A summary will be generated for your reference.",
  stepMessage: (tunnelName: string, configFile: string) =>
    `Starting ${tunnelName} tunnel in the configuration file '${configFile}'`,
  summary: "Local Tunnel Service Summary:",
  successSummary: (src: string, dist: string) => `Tunneling ${src} -> ${dist}`,
  learnMore: (link: string) => `Visit ${link} to learn more about local tunnel task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-local-tunnel-task", // TODO: update local tunnel help link
  startMessage: "Starting local tunnel service.",
  successMessage: "Local tunnel service is started successfully.",
  errorMessage: "Failed to start local tunnel service.",
});

export const setUpTabDisplayMessages: DisplayMessages = {
  taskName: "Set up Tab",
  check:
    "Teams Toolkit is setting up Tab for debugging. A summary will be generated for your reference.",
  checkNumber: "We are running total @number of steps for you.",
  summary: "Set up Tab Summary:",
  learnMore: "Visit @Link to learn more about Set up Tab task.",
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab",
  launchServices: "",
  errorName: ExtensionErrors.SetUpTabError,
  errorMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab",
};

export const setUpBotDisplayMessages: DisplayMessages = {
  taskName: "Set up Bot",
  check:
    "Teams Toolkit is setting up Bot for debugging. A summary will be generated for your reference.",
  checkNumber: "We are running total @number of steps for you.",
  summary: "Set up Bot Summary:",
  learnMore: "Visit @Link to learn more about Set up Bot task.",
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot",
  launchServices: "",
  errorName: ExtensionErrors.SetUpBotError,
  errorMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot",
};

export const setUpSSODisplayMessages: DisplayMessages = {
  taskName: "Set up SSO",
  check:
    "Teams Toolkit is setting up SSO for debugging. A summary will be generated for your reference.",
  checkNumber: "We are running total @number of steps for you.",
  summary: "Set up SSO Summary:",
  learnMore: "Visit @Link to learn more about Set up SSO task.",
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso",
  launchServices: "",
  errorName: ExtensionErrors.SetUpSSOError,
  errorMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso",
};

export const prepareManifestDisplayMessages: DisplayMessages = {
  taskName: "Build and upload Teams manifest",
  check:
    "Teams Toolkit is building and uploading Teams manifest for debugging. A summary will be generated for your reference.",
  checkNumber: "We are running total @number of steps for you.",
  summary: "Build and upload Teams manifest Summary:",
  learnMore: "Visit @Link to learn more about Build and upload Teams manifest task.",
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest",
  launchServices: "",
  errorName: ExtensionErrors.PrepareManifestError,
  errorMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest",
};
