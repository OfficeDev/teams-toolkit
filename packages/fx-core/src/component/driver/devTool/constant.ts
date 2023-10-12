// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getLocalizedString } from "../../../common/localizeUtils";

export const TelemetryProperties = Object.freeze({
  driverArgs: "driver-args",
  devCertStatus: "dev-cert-status",
  funcStatus: "func-status",
  dotnetStatus: "dotnet-status",
  testToolStatus: "test-tool-status",
});

export enum TelemetryDepsCheckStatus {
  success = "success",
  warn = "warn",
  failed = "failed",
}

export enum TelemetryDevCertStatus {
  Disabled = "disabled",
  AlreadyTrusted = "already-trusted",
  Trusted = "trusted",
  NotTrusted = "not-trusted",
}

export const toolsInstallDescription = (): string =>
  getLocalizedString("driver.prerequisite.description");

export const Summaries = Object.freeze({
  devCertSuccess: (trustDevCert: boolean): string =>
    trustDevCert
      ? getLocalizedString("driver.prerequisite.summary.devCert.trusted.succuss")
      : getLocalizedString("driver.prerequisite.summary.devCert.notTrusted.succuss"),
  devCertSkipped: (): string => getLocalizedString("driver.prerequisite.summary.devCert.skipped"),
  funcSuccess: (binFolders?: string[]): string =>
    binFolders && binFolders?.length > 0
      ? getLocalizedString("driver.prerequisite.summary.func.installedWithPath", binFolders?.[0])
      : getLocalizedString("driver.prerequisite.summary.func.installed"),
  dotnetSuccess: (binFolders?: string[]): string =>
    binFolders && binFolders.length > 0
      ? getLocalizedString("driver.prerequisite.summary.dotnet.installedWithPath", binFolders[0])
      : getLocalizedString("driver.prerequisite.summary.dotnet.installed"),
  testToolSuccess: (binFolders?: string[]): string =>
    binFolders && binFolders?.length > 0
      ? getLocalizedString(
          "driver.prerequisite.summary.testTool.installedWithPath",
          binFolders?.[0]
        )
      : getLocalizedString("driver.prerequisite.summary.testTool.installed"),
});
