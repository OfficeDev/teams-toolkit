// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../localizeUtils";

export const Messages = {
  learnMoreButtonText: getLocalizedString("depChecker.learnMoreButtonText"),
  defaultErrorMessage: [
    getDefaultString("error.depChecker.DefaultErrorMessage"),
    getLocalizedString("error.depChecker.DefaultErrorMessage"),
  ],

  startInstallFunctionCoreTool: getLocalizedString("depChecker.startInstallFunctionCoreTool"),
  finishInstallFunctionCoreTool: getLocalizedString("depChecker.finishInstallFunctionCoreTool"),
  needReplaceWithFuncCoreToolV3: getLocalizedString("depChecker.needReplaceWithFuncCoreToolV3"),
  needInstallFuncCoreTool: getLocalizedString("depChecker.needInstallFuncCoreTool"),
  failToInstallFuncCoreTool: getLocalizedString("depChecker.failToInstallFuncCoreTool"),
  failToValidateFuncCoreTool: getLocalizedString("depChecker.failToValidateFuncCoreTool"),
  funcNodeNotMatched: getLocalizedString("depChecker.funcNodeNotMatched"),

  startInstallNgrok: getLocalizedString("depChecker.startInstallNgrok"),
  finishInstallNgrok: getLocalizedString("depChecker.finishInstallNgrok"),
  needInstallNgrok: getLocalizedString("depChecker.needInstallNgrok"),
  failToInstallNgrok: getLocalizedString("depChecker.failToInstallNgrok"),
  failToValidateNgrok: getLocalizedString("depChecker.failToValidateNgrok"),

  downloadDotnet: getLocalizedString("depChecker.downloadDotnet"),
  finishInstallDotnet: getLocalizedString("depChecker.finishInstallDotnet"),
  useGlobalDotnet: getLocalizedString("depChecker.useGlobalDotnet"),
  dotnetInstallStderr: getLocalizedString("depChecker.dotnetInstallStderr"),
  dotnetInstallErrorCode: getLocalizedString("depChecker.dotnetInstallErrorCode"),
  failToInstallDotnet: getLocalizedString("depChecker.failToInstallDotnet"),

  NodeNotFound: getLocalizedString("depChecker.NodeNotFound"),
  NodeNotSupported: getLocalizedString("depChecker.NodeNotSupported"),

  dotnetNotFound: getLocalizedString("depChecker.dotnetNotFound"),
  depsNotFound: getLocalizedString("depChecker.depsNotFound"),

  linuxDepsNotFound: getLocalizedString("depChecker.linuxDepsNotFound"),

  linuxDepsNotFoundHelpLinkMessage: getLocalizedString(
    "depChecker.linuxDepsNotFoundHelpLinkMessage"
  ),
};
