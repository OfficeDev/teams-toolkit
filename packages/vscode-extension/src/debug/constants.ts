// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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

export enum SideloadingHintStateKeys {
  DoNotShowAgain = "sideloadingHint/doNotShowAgain",
}

export enum PortWarningStateKeys {
  DoNotShowAgain = "localDebugPortWarning/doNotShowAgain",
}

export const localDebugFAQUrl =
  "https://github.com/OfficeDev/TeamsFx/blob/dev/docs/fx-core/localdebug-help.md#what-to-do-if-teams-shows-app-not-found-when-the-teams-web-client-is-opened";

export const localDebugHelpDoc = "https://aka.ms/teamsfx-localdebug";
export const portInUseHelpLink = "https://aka.ms/teamsfx-port-in-use";
export const skipNgrokHelpLink = "https://aka.ms/teamsfx-skip-ngrok";
export const trustDevCertHelpLink = "https://aka.ms/teamsfx-trust-dev-cert";

export const skipNgrokRetiredNotification =
  "Property 'skipNgrok' in '.fx/configs/localSettings.json' has been retired. Use 'fx-extension.prerequisiteCheck.ngrok' in VSCode settings instead.";
export const trustDevCertRetiredNotification =
  "Property 'trustDevCert' in '.fx/configs/localSettings.json' has been retired. Use 'fx-extension.prerequisiteCheck.devCert' in VSCode settings instead.";
