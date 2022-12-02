// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getLocalizedString } from "../../../common/localizeUtils";

export const TelemetryProperties = Object.freeze({
  driverArgs: "driver-args",
  devCertStatus: "dev-cert-status",
  funcStatus: "func-status",
  dotnetStatus: "dotnet-status",
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

export const ProgressMessages = Object.freeze({
  title: () => getLocalizedString("driver.tools.progressBar.title"),
  devCert: () => getLocalizedString("driver.tools.progressBar.devCert"),
  dotnet: () => getLocalizedString("driver.tools.progressBar.dotnet"),
  func: () => getLocalizedString("driver.tools.progressBar.func"),
});

export const toolsInstallDescription = (): string => getLocalizedString("driver.tools.description");

export const Summaries = Object.freeze({
  devCertSuccess: (trustDevCert: boolean): string =>
    trustDevCert
      ? getLocalizedString("driver.tools.summary.devCert.trusted.succuss")
      : getLocalizedString("driver.tools.summary.devCert.notTrusted.succuss"),
  devCertSkipped: (): string => getLocalizedString("driver.tools.summary.devCert.skipped"),
  funcSuccess: (binFolders?: string[]): string =>
    binFolders && binFolders?.length > 0
      ? getLocalizedString("driver.tools.summary.func.installedWithPath", binFolders?.[0])
      : getLocalizedString("driver.tools.summary.func.installed"),
  dotnetSuccess: (binFolders?: string[]): string =>
    binFolders && binFolders?.length > 0
      ? getLocalizedString("driver.tools.summary.dotnet.installedWithPath")
      : getLocalizedString("driver.tools.summary.dotnet.installed"),
});
