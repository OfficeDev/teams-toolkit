// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { defaultHelpLink } from "@microsoft/teamsfx-core/build/common/deps-checker";
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
  title: string;
  checkNumber: (stepNumber: number) => string;
  summary: string;
  learnMore: (helpLink: string) => string;
  learnMoreHelpLink: string;
  launchServices?: string;
  errorName: string;
  errorMessageKey: string;
  errorDisplayMessageKey: string;
  errorMessageLink: string;
  errorHelpLink: string;
  errorMessageCommand: string;
};

function stepPrefix(stepNumber: number) {
  return stepNumber > 1 ? `(Totally ${stepNumber} steps)` : `(Totally ${stepNumber} step)`;
}

export const prerequisiteCheckDisplayMessages: DisplayMessages = {
  taskName: "Prerequisites Check",
  title: "Prerequisites Check",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is checking if all required prerequisites are installed and will install them if not.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about prerequisites check.`,
  learnMoreHelpLink: defaultHelpLink,
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorMessageCommand: openOutputPanelCommand,
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-envchecker-help",
  launchServices:
    "Services will be launched locally, please check your terminal window for details.",
};

export const prerequisiteCheckForGetStartedDisplayMessages: DisplayMessages = {
  taskName: "Get Started Prerequisites Check",
  title: "Get Started Prerequisites Check",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is checking if all required prerequisites are installed and will install them if not.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about get started prerequisites check.`,
  learnMoreHelpLink: defaultHelpLink,
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorMessageCommand: openOutputPanelCommand,
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-envchecker-help",
};

export const prerequisiteCheckTaskDisplayMessages: DisplayMessages = {
  taskName: "Validate & install prerequisites",
  title: "Running 'Validate & install prerequisites' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is checking if all required prerequisites are installed and will install them if not.`,
  summary: "Summary:",
  learnMore: (link: string) =>
    `Visit ${link} to learn more about 'Validate & install prerequisites' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-check-prerequisites-task", // TODO: update npm install help lin
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckTaskFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckTaskFailure",
  errorMessageCommand: openOutputPanelCommand,
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-check-prerequisites-task", // TODO: update npm install help link
};

export const npmInstallDisplayMessages: DisplayMessages = {
  taskName: "Install npm packages",
  title: "Running 'Install npm packages' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is checking if all the npm packages are installed and will install them if not.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Install npm packages' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-npm-package-task", // TODO: update npm install help link
  errorName: ExtensionErrors.PrerequisitesInstallPackagesError,
  errorMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  errorMessageCommand: openTerminalCommand,
  errorMessageLink: "teamstoolkit.localDebug.terminal",
  errorHelpLink: "https://aka.ms/teamsfx-npm-package-task", // TODO: update npm install help link
};

export const localTunnelDisplayMessages = Object.freeze({
  taskName: "Start local tunnel",
  title: "Running 'Start local tunnel' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is starting the local tunnel service to forward public ngrok URL to local port and inspect traffic. Toolkit uses tunnel named 'bot' to forward the bot traffic, so make sure it is defined in the ngrok.yml, or you can customize it using 'tunnelName' in 'Start local tunnel' task`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Start local tunnel' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-local-tunnel-task", // TODO: update local tunnel help link
  successSummary: (src: string, dist: string) => `Forwarding ngrok URL ${dist} to ${src}`,
  startMessage: "Starting local tunnel service.",
  forwardingUrl: (src: string, dist: string) => `Forwarding URL ${dist} to ${src}`,
  successMessage: "Local tunnel service is started successfully.",
  errorMessage: "Failed to start local tunnel service.",
});

export const setUpTabDisplayMessages: DisplayMessages = {
  taskName: "Set up tab",
  title: "Running 'Set up tab' Visual Studio Code task.",
  checkNumber: (n: number) => `${stepPrefix(n)} Teams Toolkit is setting up tab for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Set up tab' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab",
  errorName: ExtensionErrors.SetUpTabError,
  errorMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab",
};

export const setUpBotDisplayMessages: DisplayMessages = {
  taskName: "Set up bot",
  title: "Running 'Set up bot' Visual Studio Code task.",
  checkNumber: (n: number) => `${stepPrefix(n)} Teams Toolkit is setting up bot for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Set up bot' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot",
  errorName: ExtensionErrors.SetUpBotError,
  errorMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot",
};

export const setUpSSODisplayMessages: DisplayMessages = {
  taskName: "Set up SSO",
  title: "Running 'Set up SSO' Visual Studio Code task.",
  checkNumber: (n: number) => `${stepPrefix(n)} Teams Toolkit is setting up SSO for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Set up SSO' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso",
  errorName: ExtensionErrors.SetUpSSOError,
  errorMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso",
};

export const prepareManifestDisplayMessages: DisplayMessages = {
  taskName: "Build and upload Teams manifest",
  title: "Running 'Build and upload Teams manifest' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(n)} Teams Toolkit is building and uploading Teams manifest for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) =>
    `Visit ${link} to learn more about 'Build and upload Teams manifest' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest",
  errorName: ExtensionErrors.PrepareManifestError,
  errorMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest",
};

export const TaskCommand = Object.freeze({
  checkPrerequisites: "debug-check-prerequisites",
  npmInstall: "debug-npm-install",
  startLocalTunnel: "debug-start-local-tunnel",
  setUpTab: "debug-set-up-tab",
  setUpBot: "debug-set-up-bot",
  setUpSSO: "debug-set-up-sso",
  prepareManifest: "debug-prepare-manifest",
});

export const DebugSessionExists = "Debug session exists";
