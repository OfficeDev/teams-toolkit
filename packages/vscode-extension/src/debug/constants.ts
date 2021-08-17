// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const frontendStartCommand = "frontend start";
export const backendStartCommand = "backend start";
export const authStartCommand = "auth start";
export const ngrokStartCommand = "ngrok start";
export const botStartCommand = "bot start";
export const openWenClientCommand = "launch Teams web client";
export const backendWatchCommand = "backend watch";

export const frontendProblemMatcher = "$teamsfx-frontend-watch";
export const backendProblemMatcher = "$teamsfx-backend-watch";
export const authProblemMatcher = "$teamsfx-auth-watch";
export const ngrokProblemMatcher = "$teamsfx-ngrok-watch";
export const botProblemMatcher = "$teamsfx-bot-watch";
export const tscWatchProblemMatcher = "$tsc-watch";

export const frontendFolderName = "tabs";
export const backendFolderName = "api";
export const botFolderName = "bot";

export const localEnvFileName = "local.env";
export const manifestFileName = "manifest.source.json";
export const userDataFileName = "default.userdata"; // TODO: different file name for different environment

export const frontendLocalEnvPrefix = "FRONTEND_";
export const backendLocalEnvPrefix = "BACKEND_";
export const authLocalEnvPrefix = "AUTH_";
export const authServicePathEnvKey = "AUTH_SERVICE_PATH";
export const botLocalEnvPrefix = "BOT_";

export enum ProgrammingLanguage {
  javascript = "javascript",
  typescript = "typescript",
}

export const skipNgrokConfigKey = "fx-resource-local-debug.skipNgrok";

const allAddressIPv4 = "0.0.0.0";
const allAddressIPv6 = "::";
const loopbackAddressIPv4 = "127.0.0.1";
const loopbackAddressIPv6 = "::1";
const hosts = [allAddressIPv4, loopbackAddressIPv4, allAddressIPv6, loopbackAddressIPv6];

export const frontendPorts: [number, string[]][] = [
  [3000, hosts],
  [5000, hosts],
];
export const backendPorts: [number, string[]][] = [
  [7071, hosts],
  [9229, hosts],
];
export const botPorts: [number, string[]][] = [
  [3978, hosts],
  [9239, hosts],
];

export const npmInstallFailedHintMessage =
  "Task '%s' failed. Please refer to the '%s' terminal window for detailed error information or click 'Report Issue' button to report the issue.";
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
export const sideloadingHintMessage =
  "If any error occurs during local debug, you can refer to the FAQ page by clicking 'Open FAQ' button.";
export const localDebugFAQUrl =
  "https://github.com/OfficeDev/TeamsFx/blob/dev/docs/fx-core/localdebug-help.md#what-to-do-if-teams-shows-app-not-found-when-the-teams-web-client-is-opened";
