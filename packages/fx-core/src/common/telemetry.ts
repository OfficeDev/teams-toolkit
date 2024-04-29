// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, SystemError } from "@microsoft/teamsfx-api";
import { TelemetryConstants } from "../component/constants";
import { TOOLS, globalVars } from "../core/globalVars";
import { ProjectTypeResult } from "./projectTypeChecker";
import { assign } from "lodash";
import { ProjectType } from "@microsoft/m365-spec-parser";
import { maskSecret } from "./stringUtils";

export enum TelemetryProperty {
  TriggerFrom = "trigger-from",
  Component = "component",
  Components = "components",
  Feature = "feature",
  Hosting = "hosting",
  AppId = "appid",
  BotId = "botid",
  Success = "success",
  ErrorType = "error-type",
  ErrorCode = "error-code",
  ErrorMessage = "error-message",
  SampleAppName = "sample-app-name",
  ProjectId = "project-id",
  NewProjectId = "new-project-id",
  CorrelationId = "correlation-id",
  Env = "env",
  CustomizeResourceGroupType = "customize-resource-group-type",
  EnvConfig = "env-config",
  Status = "status",
  HostType = "hostType",
  AzureResources = "azure-resources",
  Capabilities = "capabilities",
  ActivePlugins = "active-plugins",
  IsCopilotAllowed = "is-copilot-allowed",
  IsSideloadingAllowed = "is-sideloading-allowed",
  NeedMigrateAadManifest = "need-migrate-aad-manifest",
  CheckCopilotTracingId = "copilot-trace-id",
  CheckSideloadingStatusCode = "status-code",
  CheckSideloadingMethod = "method",
  CheckSideloadingUrl = "url",
  TemplateGroup = "template-group",
  TemplateLanguage = "template-language",
  TemplateScenario = "template-scenario",
  TemplateFallback = "template-fallback",
  TemplateName = "template-name",
  SampleDownloadDirectory = "sample-download-directory",
  Fallback = "fallback",
  HasSwitchedSubscription = "has-switched-subscription",
  HasSwitchedM365Tenant = "has-switched-m365",
  CustomizeSubscriptionType = "customize-subscription-type",
  IsFromTdp = "is-from-developer-portal",
  ToolkitVersion = "toolkit-version",
  YmlName = "yml-name",
  YmlSchemaVersion = "yml-schema-version",
  GraphPermission = "graph-permission",
  GraphPermissionHasRole = "graph-permission-has-role",
  GraphPermissionHasAdminScope = "graph-permission-has-admin-scope",
  GraphPermissionScopes = "graph-permission-scopes",
  GraphPermissionRoles = "graph-permission-roles",
  RscApplication = "rsc-application",
  RscDelegated = "rsc-delegated",

  AadManifest = "aad-manifest",

  CustomCopilotAgent = "custom-copilot-agent",
  CustomCopilotRAG = "custom-copilot-rag",
  LlmService = "llm-service",
  HasAzureOpenAIKey = "has-azure-openai-key",
  HasAzureOpenAIEndpoint = "has-azure-openai-endpoint",
  HasAzureOpenAIDeploymentName = "has-azure-openai-deployment-name",
  HasOpenAIKey = "has-openai-key",
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
  CheckCopilot = "check-copilot",
  CheckResourceGroupStart = "check-resource-group-start",
  CheckResourceGroup = "check-resource-group",
  CheckSubscriptionStart = "check-subscription-start",
  CheckSubscription = "check-subscription",
  CheckSideloading = "check-sideloading",
  EnvConfig = "env-config",
  DisplayToolingUpdateNotification = "display-tooling-update-notification",
  ProjectMigratorNotificationStart = "project-migrator-notification-start",
  ProjectMigratorNotification = "project-migrator-notification",
  ProjectMigratorMigrateStart = "project-migrator-migrate-start",
  ProjectMigratorMigrate = "project-migrator-migrate",
  ProjectMigratorPrecheckFailed = "project-migrator-pre-check-failed",
  ProjectMigratorError = "project-migrator-error",
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
  GenerateTemplate = "generate-template",
  GenerateSample = "generate-sample",
  ConfirmProvision = "confirm-provision",
  CheckLocalDebugTenant = "check-local-debug-tenant",
  DebugSetUpSSO = "debug-set-up-sso",
  DeploymentInfoNotFound = "deployment-info-not-found",
  InstallScriptNotFound = "install-script-not-found",
  SkipDeploy = "skip-deploy",
  PublishInDeveloperPortal = "publish-in-developer-portal",
  MetaData = "metadata",
  ProjectType = "project-type",
  DependencyApi = "dependency-api",
  AppStudioApi = "app-studio-api",
}

export enum ProjectTypeProps {
  IsTeamsFx = "is-teamsfx",
  TeamsfxConfigType = "teamsfx-config-type",
  TeamsfxConfigVersion = "teamsfx-config-version",
  TeamsfxVersionState = "teamsfx-version-state",
  TeamsfxProjectId = "teamsfx-project-id",
  TeamsManifest = "has-manifest",
  TeamsManifestVersion = "manifest-version",
  TeamsManifestAppId = "manifest-app-id",
  TeamsManifestCapabilities = "manifest-capabilities",
  TeamsJs = "teams-js",
  Lauguages = "languages",
  OfficeAddinProjectType = "office-addin-project-type",
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

export enum CustomizeSubscriptionType {
  CommandLine = "command-line",
  EnvConfig = "env-config",
  EnvState = "env-state",
  Default = "default",
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
  TOOLS.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
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

  fillInTelemetryPropsForFxError(properties, fxError);

  TOOLS.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, {});
}

/**
 * fill in telemetry properties for FxError
 * @param error FxError
 * @param props teletry properties
 */
export function fillInTelemetryPropsForFxError(
  props: Record<string, string>,
  error: FxError
): void {
  const errorCode = error.source + "." + error.name;
  const errorType =
    error instanceof SystemError
      ? TelemetryConstants.values.systemError
      : TelemetryConstants.values.userError;
  props[TelemetryConstants.properties.success] = TelemetryConstants.values.no;
  props[TelemetryConstants.properties.errorCode] =
    props[TelemetryConstants.properties.errorCode] || errorCode;
  props[TelemetryConstants.properties.errorType] = errorType;
  props[TelemetryConstants.properties.errorMessage] = error.skipProcessInTelemetry
    ? error.message
    : maskSecret(error.message);
  props[TelemetryConstants.properties.errorStack] = extractMethodNamesFromErrorStack(error.stack); // error stack will not append in error-message any more
  props[TelemetryConstants.properties.errorName] = error.name;

  // append global context properties
  props[TelemetryConstants.properties.errorComponent] = globalVars.component;
  props[TelemetryConstants.properties.errorStage] = globalVars.stage;
  props[TelemetryConstants.properties.errorMethod] = globalVars.method;
  props[TelemetryConstants.properties.errorSource] = globalVars.source;
  if (error.innerError && error.innerError["code"]) {
    props[TelemetryConstants.properties.errorInnerCode] = error.innerError["code"];
  }

  // if (error.innerError) {  // inner-error is retired
  //   props[TelemetryConstants.properties.innerError] = JSON.stringify(
  //     error.innerError,
  //     Object.getOwnPropertyNames(error.innerError)
  //   );
  // }

  if (error.categories) {
    props[TelemetryConstants.properties.errorCat] = error.categories.join("|");
    props[TelemetryConstants.properties.errorCat1] = error.categories[0];
    props[TelemetryConstants.properties.errorCat2] = error.categories[1];
    props[TelemetryConstants.properties.errorCat3] = error.categories[2];
  }
}

export function fillinProjectTypeProperties(
  props: Record<string, string>,
  projectTypeRes: ProjectTypeResult
) {
  const newProps = {
    [ProjectTypeProps.IsTeamsFx]: projectTypeRes.isTeamsFx ? "true" : "false",
    [ProjectTypeProps.TeamsfxConfigType]: projectTypeRes.teamsfxConfigType || "",
    [ProjectTypeProps.TeamsfxConfigVersion]: projectTypeRes.teamsfxConfigVersion || "",
    [ProjectTypeProps.TeamsfxVersionState]: projectTypeRes.teamsfxVersionState || "",
    [ProjectTypeProps.TeamsJs]: projectTypeRes.dependsOnTeamsJs ? "true" : "false",
    [ProjectTypeProps.TeamsManifest]: projectTypeRes.hasTeamsManifest ? "true" : "false",
    [ProjectTypeProps.TeamsManifestVersion]: projectTypeRes.manifestVersion || "",
    [ProjectTypeProps.TeamsManifestAppId]: projectTypeRes.manifestAppId || "",
    [ProjectTypeProps.TeamsfxProjectId]: projectTypeRes.teamsfxProjectId || "",
    [ProjectTypeProps.Lauguages]: projectTypeRes.lauguages.join(","),
    [ProjectTypeProps.TeamsManifestCapabilities]:
      projectTypeRes.manifestCapabilities?.join(",") || "",
    [ProjectTypeProps.OfficeAddinProjectType]: projectTypeRes.officeAddinProjectType || "",
  };
  assign(props, newProps);
}

export function extractMethodNamesFromErrorStack(stack?: string): string {
  if (!stack) return "";
  const methodNamesRegex = /at\s([\w.<>\[\]\s]+)\s\(/g;
  let match;
  const methodNames: string[] = [];
  while ((match = methodNamesRegex.exec(stack)) !== null) {
    methodNames.push(match[1]);
  }
  return methodNames.join(" | ");
}
