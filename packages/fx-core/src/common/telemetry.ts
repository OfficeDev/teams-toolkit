// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, TelemetryReporter, UserError } from "@microsoft/teamsfx-api";

export class TelemetryReporterInstance {
  public static telemetryReporter: TelemetryReporter | undefined;
}

export enum TelemetryProperty {
  TriggerFrom = "trigger-from",
  Component = "component",
  Components = "components",
  Feature = "feature",
  Hosting = "hosting",
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
  IsSideloadingAllowed = "is-sideloading-allowed",
  NeedMigrateAadManifest = "need-migrate-aad-manifest",
  CheckSideloadingHttpStatus = "check-sideloading-http-status",
  TemplateGroup = "template-group",
  TemplateLanguage = "template-language",
  TemplateScenario = "template-scenario",
  TemplateFallback = "template-fallback",
  HasSwitchedSubscription = "has-switched-subscription",
  HasSwitchedM365Tenant = "has-switched-m365",
}

export enum TelemetryEvent {
  Scaffold = "scaffold",
  GenerateBicep = "generate-arm-templates",
  LocalDebug = "local-debug",
  PostLocalDebug = "post-local-debug",
  Provision = "provision",
  PostProvision = "post-provision",
  PreDeploy = "pre-deploy",
  Deploy = "deploy",
  DownloadSampleStart = "download-sample-start",
  DownloadSample = "download-sample",
  CreateProject = "create",
  AddFeature = "add-feature",
  ProjectUpgrade = "project-upgrade",
  ProjectUpgradeStart = "project-upgrade-start",
  ReadJson = "read-json",
  DecryptUserdata = "decrypt-userdata",
  CheckResourceGroupStart = "check-resource-group-start",
  CheckResourceGroup = "check-resource-group",
  CheckSubscriptionStart = "check-subscription-start",
  CheckSubscription = "check-subscription",
  CheckSideloading = "check-sideloading",
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
  ProjectMigratorPrecheckFailed = "project-migrator-pre-check-failed",
  ProjectMigratorError = "project-migrator-error",
  ProjectAadManifestMigrationError = "project-aad-manifest-migration-error",
  ProjectAadManifestMigrationStart = "project-aad-manifest-migration-start",
  ProjectAadManifestMigration = "project-aad-manifest-migration",
  ProjectAadManifestMigrationAddAADTemplateStart = "project-aad-manifest-migration-add-aad-template-start",
  ProjectAadManifestMigrationAddAADTemplate = "project-aad-manifest-migration-add-aad-template",
  ProjectAadManifestMigrationBackupStart = "project-aad-manifest-migration-backup-start",
  ProjectAadManifestMigrationBackup = "project-aad-manifest-migration-backup",
  ProjectConsolidateNotificationStart = "project-consolidate-notification-start",
  ProjectConsolidateNotification = "project-consolidate-notification",
  ProjectConsolidateUpgradeStart = "project-consolidate-upgrade-start",
  ProjectConsolidateUpgrade = "project-consolidate-upgrade",
  ProjectConsolidateAddLocalEnvStart = "project-consolidate-add-local-env-start",
  ProjectConsolidateAddLocalEnv = "project-consolidate-add-local-env",
  ProjectConsolidateAddSPFXManifestStart = "project-consolidate-add-spfx-manifest-start",
  ProjectConsolidateAddSPFXManifest = "project-consolidate-add-spfx-manifest",
  ProjectConsolidateCopyAzureManifestStart = "project-consolidate-copy-azure-manifest-start",
  ProjectConsolidateCopyAzureManifest = "project-consolidate-copy-azure-manifest",
  ProjectConsolidateAddAzureManifestStart = "project-consolidate-add-azure-manifest-start",
  ProjectConsolidateAddAzureManifest = "project-consolidate-add-azure-manifest",
  ProjectConsolidateBackupConfigStart = "project-consolidate-backup-config-start",
  ProjectConsolidateBackupConfig = "project-consolidate-backup-config",
  ProjectConsolidateGuideStart = "project-Consolidate-guide-start",
  ProjectConsolidateGuide = "project-consolidate-guide",
  ProjectConsolidateError = "project-consolidate-error",
  ProjectConsolidateCheckManifestError = "project-consolidate-check-manifest-error",
  DetectPortStart = "detect-port-start",
  DetectPort = "detect-port",
  FillProjectId = "fill-project-id",
  ScaffoldFromTemplatesStart = "scaffold-from-templates-start",
  ScaffoldFromTemplates = "scaffold-from-templates",
  ConfirmProvision = "confirm-provision",
  CheckLocalDebugTenant = "check-local-debug-tenant",
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
  EnvState = "env-state",
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
  TelemetryReporterInstance.telemetryReporter?.sendTelemetryEvent(
    eventName,
    properties,
    measurements
  );
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

  TelemetryReporterInstance.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, {});
}
