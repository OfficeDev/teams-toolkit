// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../localizeUtils";
import { nodeInstallationLink } from "./helpLink";

export const Messages = {
  // learnMoreButtonText: getLocalizedString("depChecker.learnMoreButtonText"),
  defaultErrorMessage: () => [
    getDefaultString("error.depChecker.DefaultErrorMessage"),
    getLocalizedString("error.depChecker.DefaultErrorMessage"),
  ],
  needInstallNpm: () => getLocalizedString("depChecker.needInstallNpm"),
  failToValidateFuncCoreTool: () => getLocalizedString("depChecker.failToValidateFuncCoreTool"),
  portableFuncNodeNotMatched: (nodeVersion: string, funcVersion: string) =>
    getLocalizedString("depChecker.portableFuncNodeNotMatched")
      .replace("@NodeVersion", nodeVersion)
      .replace("@FuncVersion", funcVersion),
  symlinkDirAlreadyExist: () => getLocalizedString("depChecker.symlinkDirAlreadyExist"),
  invalidFuncVersion: (version: string) =>
    getLocalizedString("depChecker.invalidFuncVersion", version),
  noSentinelFile: () => getLocalizedString("depChecker.noSentinelFile"),
  funcVersionNotMatch: (funcVersion: string, expectedFuncVersion: string) =>
    getLocalizedString("depChecker.funcVersionNotMatch", funcVersion, expectedFuncVersion),

  downloadDotnet: () => getLocalizedString("depChecker.downloadDotnet"),
  finishInstallDotnet: () => getLocalizedString("depChecker.finishInstallDotnet"),
  useGlobalDotnet: () => getLocalizedString("depChecker.useGlobalDotnet"),
  dotnetInstallStderr: () => getLocalizedString("depChecker.dotnetInstallStderr"),
  dotnetInstallErrorCode: () => getLocalizedString("depChecker.dotnetInstallErrorCode"),

  NodeNotFound: () => getLocalizedString("depChecker.NodeNotFound", nodeInstallationLink),

  // In v3, the message will be displayed in the output.
  // TODO: add localized string to FxError.displayMessage
  V3NodeNotSupported: (currentVersion: string, supportedVersions: string) =>
    getDefaultString(
      "depChecker.V3NodeNotSupported",
      currentVersion,
      supportedVersions,
      nodeInstallationLink
    ),
  NodeNotLts: (currentVersion: string, supportedVersions: string) =>
    getDefaultString(
      "depChecker.NodeNotLts",
      currentVersion,
      supportedVersions,
      nodeInstallationLink
    ),

  dotnetNotFound: () => getLocalizedString("depChecker.dotnetNotFound"),
  // depsNotFound: () => getLocalizedString("depChecker.depsNotFound"),

  testToolVersionNotMatch: (version: string, expectedVersion: string) =>
    getLocalizedString("depChecker.testToolVersionNotMatch", version, expectedVersion),
  failToValidateTestTool: (errorMessage: string) =>
    getLocalizedString("depChecker.failedToValidateTestTool", errorMessage),

  failToValidateVxTestAppInstallOptions: () =>
    getLocalizedString("depChecker.failToValidateVxTestAppInstallOptions"),
  failToValidateVxTestApp: () => getLocalizedString("depChecker.failToValidateVxTestApp"),

  failToDownloadFromUrl: () => getLocalizedString("depChecker.failToDownloadFromUrl"),

  linuxDepsNotFound: () => getLocalizedString("depChecker.linuxDepsNotFound"),

  // linuxDepsNotFoundHelpLinkMessage: () => getLocalizedString(
  //   "depChecker.linuxDepsNotFoundHelpLinkMessage"
  // ),
};
