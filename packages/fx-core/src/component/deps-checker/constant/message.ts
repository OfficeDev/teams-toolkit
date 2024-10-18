// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { nodeInstallationLink } from "./helpLink";

export const Messages = {
  needInstallNpm: () => getLocalizedString("depChecker.needInstallNpm"),
  failToValidateFuncCoreTool: () => getLocalizedString("depChecker.failToValidateFuncCoreTool"),
  portableFuncNodeNotMatched: (nodeVersion: string, funcVersion: string) =>
    getLocalizedString("depChecker.portableFuncNodeNotMatched")
      .replace("@NodeVersion", nodeVersion)
      .replace("@FuncVersion", funcVersion),
  symlinkDirAlreadyExist: (linkFilePath: string) =>
    getLocalizedString("depChecker.symlinkDirAlreadyExist", linkFilePath),
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
};
