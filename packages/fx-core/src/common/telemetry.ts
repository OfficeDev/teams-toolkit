// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, UserError } from "@microsoft/teamsfx-api";
import { telemetryReporter } from "../core";

export enum TelemetryProperty {
  TriggerFrom = "trigger-from",
  Component = "component",
  AppId = "appid",
  Success = "success",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  SampleAppName = "sample-app-name",
  ProjectId = "project-id",
  CorrelationId = "correlation-id",
  Env = "env",
  CustomizeResourceGroupType = "customize-resource-group-type",
  EnvConfig = "env-config",
  Status = "status",
  HostType = "hostType",
  AzureResources = "azure-resources",
  Capabilities = "capabilities",
  ActivePlugins = "active-plugins",
}

export enum TelemetryEvent {
  DownloadSampleStart = "download-sample-start",
  DownloadSample = "download-sample",
  ProjectUpgrade = "project-upgrade",
  ProjectUpgradeStart = "project-upgrade-start",
  ReadJson = "read-json",
  DecryptUserdata = "decrypt-userdata",
  CheckResourceGroupStart = "check-resource-group-start",
  CheckResourceGroup = "check-resource-group",
  EnvConfig = "env-config",
  ProjectMigratorNotificationStart = "project-migrator-notification-start",
  ProjectMigratorNotification = "project-migrator-notification",
  ProjectMigratorMigrateStart = "project-migrator-migrate-start",
  ProjectMigratorMigrate = "project-migrator-migrate",
  ProjectMigratorMigrateArmStart = "project-migrator-migrate-arm-start",
  ProjectMigratorMigrateArm = "project-migrator-migrate-arm",
  ProjectMigratorMigrateMultiEnvStart = "project-migrator-migrate-multi-env-start",
  ProjectMigratorMigrateMultiEnv = "project-migrator-migrate-multi-env",
  ProjectMigratorGuideStart = "project-migrator-guide-start",
  ProjectMigratorGuide = "project-migrator-guide",
}

export enum TelemetrySuccess {
  Yes = "yes",
  No = "no",
}

export enum TelemetryErrorType {
  UserError = "user",
  SystemError = "system",
}

export enum Component {
  vsc = "extension",
  cli = "cli",
  vs = "vs",
  core = "core",
  solution = "solution",
}

export enum CustomizeResourceGroupType {
  CommandLine = "command-line",
  EnvConfig = "env-config",
  EnvProfile = "env-profile",
  InteractiveCreateDefault = "interactive-create-default",
  InteractiveCreateCustomized = "interactive-create-customized",
  InteractiveUseExisting = "interactive-use-existing",
  FallbackDefault = "fallback-default",
}

export enum ProjectMigratorStatus {
  OK = "ok",
  Cancel = "cancel",
}

export enum ProjectMigratorGuideStatus {
  Reload = "reload",
  LearnMore = "learn-more",
  Cancel = "cancel",
}

export function sendTelemetryEvent(
  component: string,
  eventName: string,
  properties?: { [p: string]: string },
  measurements?: { [p: string]: number }
): void {
  if (!properties) {
    properties = {};
  }
  properties[TelemetryProperty.Component] = component;
  telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
}

export function sendTelemetryErrorEvent(
  component: string,
  eventName: string,
  fxError: FxError,
  properties?: { [p: string]: string }
): void {
  if (!properties) {
    properties = {};
  }
  properties[TelemetryProperty.Component] = component;
  properties[TelemetryProperty.Success] = TelemetrySuccess.No;
  if (fxError instanceof UserError) {
    properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
  } else {
    properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
  }

  properties[TelemetryProperty.ErrorCode] = `${fxError.source}.${fxError.name}`;
  properties[TelemetryProperty.ErrorMessage] = `${fxError.message}${
    fxError.stack ? "\nstack:\n" + fxError.stack : ""
  }`;

  telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, {});
}
