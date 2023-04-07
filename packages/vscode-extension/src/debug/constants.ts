// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as util from "util";

import { defaultHelpLink } from "@microsoft/teamsfx-core/build/common/deps-checker";
import { TaskLabel } from "@microsoft/teamsfx-core/build/common/local";
import { ExtensionErrors } from "../error";
import { getDefaultString, localize } from "../utils/localizeUtils";

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
  office = "the Microsoft 365 app",
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

export const openOutputMessage = () =>
  util.format(
    getDefaultString("teamstoolkit.localDebug.showDetail"),
    getDefaultString("teamstoolkit.localDebug.outputPanel")
  );

export const openTerminalMessage = () =>
  util.format(
    getDefaultString("teamstoolkit.localDebug.showDetail"),
    getDefaultString("teamstoolkit.localDebug.terminal")
  );

export const openOutputDisplayMessage = () =>
  util.format(
    localize("teamstoolkit.localDebug.showDetail"),
    `[${localize("teamstoolkit.localDebug.outputPanel")}](command:fx-extension.showOutputChannel)`
  );
export const openTerminalDisplayMessage = () =>
  util.format(
    localize("teamstoolkit.localDebug.showDetail"),
    `[${localize("teamstoolkit.localDebug.terminal")}](command:workbench.action.terminal.focus)`
  );

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
  errorHelpLink: string;
  showDetailMessage: () => string;
  showDetailDisplayMessage: () => string;
  durationMessage: (duration: number) => string;
};

function stepPrefix(stepNumber: number) {
  return stepNumber > 1 ? `(Total: ${stepNumber} Steps)` : `(Total: ${stepNumber} Step)`;
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
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-envchecker-help",
  launchServices:
    "Services will be launched locally, please check your terminal window for details.",
  durationMessage: (duration: number) =>
    `Finished prerequisite check in ${duration.toFixed(2)} seconds.`,
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
  learnMoreHelpLink: "https://aka.ms/teamsfx-get-started-prerequisite",
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-get-started-prerequisite",
  durationMessage: (duration: number) =>
    `Finished prerequisite check in ${duration.toFixed(2)} seconds.`,
};

export const prerequisiteCheckTaskDisplayMessages: DisplayMessages = {
  taskName: TaskLabel.PrerequisiteCheck,
  title: "Running 'Validate & install prerequisites' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is checking if all required prerequisites are installed and will install them if not.`,
  summary: "Summary:",
  learnMore: (link: string) =>
    `Visit ${link} to learn more about 'Validate & install prerequisites' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-check-prerequisites-task",
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckTaskFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckTaskFailure",
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-check-prerequisites-task",
  durationMessage: (duration: number) =>
    `Finished 'Validate & install prerequisites' Visual Studio Code task in ${duration.toFixed(
      2
    )} seconds.`,
};

export const v3PrerequisiteCheckTaskDisplayMessages: DisplayMessages = {
  taskName: TaskLabel.PrerequisiteCheckV3,
  title: "Running 'Validate prerequisites' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(n)} Teams Toolkit is checking the required prerequisites.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Validate prerequisites' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-tasks/check-prerequisites",
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckTaskFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckTaskFailure",
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-tasks/check-prerequisites",
  durationMessage: (duration: number) =>
    `Finished 'Validate prerequisites' Visual Studio Code task in ${duration.toFixed(2)} seconds.`,
};

export const npmInstallDisplayMessages: DisplayMessages = {
  taskName: TaskLabel.InstallNpmPackages,
  title: "Running 'Install npm packages' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is checking if all the npm packages are installed and will install them if not. It may take several minutes for the first time execution, you can check the TERMINAL window for progress and details.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Install npm packages' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-npm-package-task",
  errorName: ExtensionErrors.PrerequisitesInstallPackagesError,
  errorMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  showDetailMessage: openTerminalMessage,
  showDetailDisplayMessage: openTerminalDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-npm-package-task",
  durationMessage: (duration: number) =>
    `Finished 'Install npm packages' Visual Studio Code task in ${duration.toFixed(2)} seconds.`,
};

export const baseTunnelDisplayMessages = Object.freeze({
  taskName: TaskLabel.StartLocalTunnel,
  title: () => localize("teamstoolkit.localDebug.output.tunnel.title"),
  checkNumber: (n: number) =>
    `${stepPrefix(n)} ${localize("teamstoolkit.localDebug.output.tunnel.checkNumber")}`,
  summary: () => localize("teamstoolkit.localDebug.output.summary"),
  learnMore: (link: string) =>
    util.format(localize("teamstoolkit.localDebug.output.tunnel.learnMore"), link),
  learnMoreHelpLink: "https://aka.ms/teamsfx-local-tunnel-task",
  successSummary: (src: string, dest: string, envFile: string | undefined, envKeys: string[]) =>
    envFile === undefined
      ? util.format(localize("teamstoolkit.localDebug.output.tunnel.successSummary"), dest, src)
      : util.format(
          localize("teamstoolkit.localDebug.output.tunnel.successSummaryWithEnv"),
          dest,
          src,
          envKeys.join(", "),
          envFile
        ),
  terminalSuccessSummary: (
    src: string,
    dest: string,
    envFile: string | undefined,
    envKeys: string[]
  ) =>
    envFile === undefined
      ? util.format(
          getDefaultString("teamstoolkit.localDebug.output.tunnel.successSummary"),
          dest,
          src
        )
      : util.format(
          getDefaultString("teamstoolkit.localDebug.output.tunnel.successSummaryWithEnv"),
          dest,
          src,
          envKeys.join(", "),
          envFile
        ),
  durationMessage: (duration: number) =>
    util.format(localize("teamstoolkit.localDebug.output.tunnel.duration"), duration.toFixed(2)),
  startTerminalMessage: "Starting local tunnel service", // begin pattern of problem matcher
  successTerminalMessage: "Local tunnel service is started successfully.", // end pattern of problem matcher
  errorTerminalMessage: "Failed to start local tunnel service.", // end pattern of problem matcher
});

export type TunnelDisplayMessages = typeof baseTunnelDisplayMessages;
export const devTunnelDisplayMessages = Object.freeze(
  Object.assign(
    {
      startDevTunnelMessage: () => localize("teamstoolkit.localDebug.output.tunnel.startDevTunnel"),
      createDevTunnelTerminalMessage: (tag: string) =>
        util.format(
          getDefaultString("teamstoolkit.localDebug.output.tunnel.createDevTunnelMessage"),
          tag
        ),
    },
    baseTunnelDisplayMessages
  )
);
export const ngrokTunnelDisplayMessages = Object.freeze(
  Object.assign(
    {
      startNgrokMessage: () => localize("teamstoolkit.localDebug.output.tunnel.startNgrokMessage"),
      checkNgrokMessage: () => localize("teamstoolkit.localDebug.output.tunnel.checkNgrokMessage"),
      installSuccessMessage: (ngrokPath: string) =>
        util.format(
          localize("teamstoolkit.localDebug.output.tunnel.installSuccessMessage"),
          ngrokPath
        ),
      skipInstallMessage: (ngrokPath: string) =>
        util.format(
          localize("teamstoolkit.localDebug.output.tunnel.skipInstallMessage"),
          ngrokPath
        ),
    },
    baseTunnelDisplayMessages
  )
);

export const setUpTabDisplayMessages: DisplayMessages = {
  taskName: TaskLabel.SetUpTab,
  title: "Running 'Set up tab' Visual Studio Code task.",
  checkNumber: (n: number) => `${stepPrefix(n)} Teams Toolkit is setting up tab for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Set up tab' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab-task",
  errorName: ExtensionErrors.SetUpTabError,
  errorMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab-task",
  durationMessage: (duration: number) =>
    `Finished 'Set up tab' Visual Studio Code task in ${duration.toFixed(2)} seconds.`,
};

export const setUpBotDisplayMessages: DisplayMessages = {
  taskName: TaskLabel.SetUpBot,
  title: "Running 'Set up bot' Visual Studio Code task.",
  checkNumber: (n: number) => `${stepPrefix(n)} Teams Toolkit is setting up bot for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Set up bot' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot-task",
  errorName: ExtensionErrors.SetUpBotError,
  errorMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot-task",
  durationMessage: (duration: number) =>
    `Finished 'Set up bot' Visual Studio Code task in ${duration.toFixed(2)} seconds.`,
};

export const setUpSSODisplayMessages: DisplayMessages = {
  taskName: TaskLabel.SetUpSSO,
  title: "Running 'Set up SSO' Visual Studio Code task.",
  checkNumber: (n: number) => `${stepPrefix(n)} Teams Toolkit is setting up SSO for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) => `Visit ${link} to learn more about 'Set up SSO' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso-task",
  errorName: ExtensionErrors.SetUpSSOError,
  errorMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso-task",
  durationMessage: (duration: number) =>
    `Finished 'Set up SSO' Visual Studio Code task in ${duration.toFixed(2)} seconds.`,
};

export const prepareManifestDisplayMessages: DisplayMessages = {
  taskName: TaskLabel.PrepareManifest,
  title: "Running 'Build and upload Teams manifest' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(n)} Teams Toolkit is building and uploading Teams manifest for debugging.`,
  summary: "Summary:",
  learnMore: (link: string) =>
    `Visit ${link} to learn more about 'Build and upload Teams manifest' task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest-task",
  errorName: ExtensionErrors.PrepareManifestError,
  errorMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  showDetailMessage: openOutputMessage,
  showDetailDisplayMessage: openOutputDisplayMessage,
  errorHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest-task",
  durationMessage: (duration: number) =>
    `Finished 'Build and upload Teams manifest' Visual Studio Code task in ${duration.toFixed(
      2
    )} seconds.`,
};

export const sideloadingDisplayMessages = Object.freeze({
  title: (hub: Hub) => `Launching ${hub} web client.`,
  sideloadingUrlMessage: (hub: Hub, url: string) =>
    `${hub} web client is being launched for you to debug the Teams app: ${url}.`,
  hotReloadingMessage:
    "The app supports hot reloading. If you have any code changes in the project, the app will be reloaded.",
});

export const launchingTeamsClientDisplayMessages = Object.freeze({
  title: "Launching Teams web client.",
  launchUrlMessage: (url: string) =>
    `Teams web client is being launched for you to debug the Teams app: ${url}.`,
  hotReloadingMessage:
    "The app supports hot reloading. If you have any code changes in the project, the app will be reloaded.",
});

export const DebugSessionExists = "Debug session exists";
