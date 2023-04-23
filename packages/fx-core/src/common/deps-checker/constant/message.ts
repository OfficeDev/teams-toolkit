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
  globalFuncNodeNotMatched: () => getLocalizedString("depChecker.globalFuncNodeNotMatched"),
  portableFuncNodeNotMatched: () => getLocalizedString("depChecker.portableFuncNodeNotMatched"),
  symlinkDirAlreadyExist: () => getLocalizedString("depChecker.symlinkDirAlreadyExist"),

  startInstallNgrok: () => getLocalizedString("depChecker.startInstallNgrok"),
  finishInstallNgrok: () => getLocalizedString("depChecker.finishInstallNgrok"),
  needInstallNgrok: () => getLocalizedString("depChecker.needInstallNgrok"),
  failToValidateNgrok: () => getLocalizedString("depChecker.failToValidateNgrok"),

  downloadDotnet: () => getLocalizedString("depChecker.downloadDotnet"),
  finishInstallDotnet: () => getLocalizedString("depChecker.finishInstallDotnet"),
  useGlobalDotnet: () => getLocalizedString("depChecker.useGlobalDotnet"),
  dotnetInstallStderr: () => getLocalizedString("depChecker.dotnetInstallStderr"),
  dotnetInstallErrorCode: () => getLocalizedString("depChecker.dotnetInstallErrorCode"),

  NodeNotFound: () => getLocalizedString("depChecker.NodeNotFound", nodeInstallationLink),
  // TODO: remove this message after clean useless code
  NodeNotSupported: () => getLocalizedString("depChecker.NodeNotSupported"),

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

  failToValidateVxTestAppInstallOptions: () =>
    getLocalizedString("depChecker.failToValidateVxTestAppInstallOptions"),
  failToValidateVxTestApp: () => getLocalizedString("depChecker.failToValidateVxTestApp"),

  failToDownloadFromUrl: () => getLocalizedString("depChecker.failToDownloadFromUrl"),

  linuxDepsNotFound: () => getLocalizedString("depChecker.linuxDepsNotFound"),

  // linuxDepsNotFoundHelpLinkMessage: () => getLocalizedString(
  //   "depChecker.linuxDepsNotFoundHelpLinkMessage"
  // ),
};
