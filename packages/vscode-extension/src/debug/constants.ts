// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as util from "util";

import { Hub, TaskLabel } from "@microsoft/teamsfx-core";
import { ExtensionErrors } from "../error/error";
import { getDefaultString, localize } from "../utils/localizeUtils";

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

export const m365AppsPrerequisitesHelpLink = "https://aka.ms/teamsfx-m365-apps-prerequisites";

export enum Host {
  teams = "teams.microsoft.com",
  outlook = "outlook.office.com",
  office = "www.office.com",
}

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

export const openTestToolMessage = () =>
  util.format(localize("teamstoolkit.localDebug.useTestTool"), "'Debug in Test Tool'");

export const openTestToolDisplayMessage = () =>
  util.format(
    localize("teamstoolkit.localDebug.useTestTool"),
    "[Debug in Test Tool](command:fx-extension.debugInTestToolFromMessage)"
  );

export const prerequisiteCheckForGetStartedDisplayMessages: DisplayMessages = {
  taskName: "Get Started Prerequisites Check",
  title: "Get Started Prerequisites Check",
  checkNumber: (n: number) =>
    `${stepPrefix(
      n
    )} Teams Toolkit is checking if all required prerequisites are installed and will install them if not.`,
  summary: "Summary:",
  learnMore: (link: string) =>
    `Visit ${link} to get more info about get started prerequisites check.`,
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

export const v3PrerequisiteCheckTaskDisplayMessages: DisplayMessages = {
  taskName: TaskLabel.PrerequisiteCheckV3,
  title: "Running 'Validate prerequisites' Visual Studio Code task.",
  checkNumber: (n: number) =>
    `${stepPrefix(n)} Teams Toolkit is checking the required prerequisites.`,
  summary: "Summary:",
  learnMore: (link: string) =>
    `Visit ${link} to get more info about 'Validate prerequisites' task.`,
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
      deleteDevTunnelMessage: (tunnelId: string) =>
        util.format(
          localize("teamstoolkit.localDebug.output.tunnel.deleteDevTunnelMessage"),
          tunnelId
        ),
      devTunnelLimitExceededMessage: () =>
        util.format(
          localize("teamstoolkit.localDebug.output.tunnel.devTunnelLimitExceededMessage"),
          "command:fx-extension.showOutputChannel"
        ),
      devTunnelListMessage: () =>
        localize("teamstoolkit.localDebug.output.tunnel.devTunnelListMessage"),
      devTunnelLimitExceededAnswerDelete: () =>
        localize("teamstoolkit.localDebug.output.tunnel.devTunnelLimitExceeded.deleteAllTunnels"),
      devTunnelLimitExceededAnswerCancel: () =>
        localize("teamstoolkit.localDebug.output.tunnel.devTunnelLimitExceeded.cancel"),
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

export const sideloadingDisplayMessages = Object.freeze({
  title: (hub: Hub) => `Launching ${hub as string} web client.`,
  sideloadingUrlMessage: (hub: Hub, url: string) =>
    `${hub as string} web client is being launched for you to debug the Teams app: ${url}.`,
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

export const RecommendedOperations = Object.freeze({
  DebugInTestTool: "debug-in-test-tool",
});
