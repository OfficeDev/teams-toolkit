// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

/**
 * File structure of this package:
 * ./common: contains common utilities and constants that are shared across different components.
 * ./component: contains the implementation of different components
 * ./core: contains the FxCore class that is the entry points implementing the lifecycle APIs of the Teams Toolkit.
 * ./error: contains the error classes used in the Teams Toolkit.
 * ./question: contains the question models used in the Teams Toolkit.
 * ./ui: contains the UI related components.
 */

import "reflect-metadata";
export { askSubscription } from "./common/azureUtils";
export {
  AppStudioScopes,
  AuthSvcScopes,
  AzureScopes,
  GraphScopes,
  SPFxScopes,
  getAllowedAppMaps,
} from "./common/constants";
export { Correlator } from "./common/correlator";
export {
  FeatureFlags,
  featureFlagManager,
  isApiCopilotPluginEnabled,
  isChatParticipantEnabled,
  isCopilotPluginEnabled,
  isFeatureFlagEnabled,
} from "./common/featureFlags";
export { globalStateGet, globalStateUpdate } from "./common/globalState";
export { getDefaultString, getLocalizedString } from "./common/localizeUtils";
export * from "./common/permissionInterface";
export * from "./common/projectSettingsHelper";
export {
  ProjectTypeResult,
  TeamsfxConfigType,
  TeamsfxVersionState,
  projectTypeChecker,
} from "./common/projectTypeChecker";
export { sendRequestWithRetry, sendRequestWithTimeout } from "./common/requestUtils";
export { SampleConfig, SampleUrlInfo, sampleProvider } from "./common/samples";
export {
  MaskSecretOptions,
  convertToAlphanumericOnly,
  getHashedEnv,
  getResourceGroupNameFromResourceId,
  getUuid,
  isValidHttpUrl,
  loadingDefaultPlaceholder,
  loadingOptionsPlaceholder,
  maskSecret,
  parseFromResourceId,
} from "./common/stringUtils";
export { telemetryUtils } from "./common/telemetry";
export { getSPFxTenant, getSideloadingStatus, listDevTunnels, setRegion } from "./common/tools";
export { MetadataV3, VersionState } from "./common/versionMetadata";
export { SummaryConstant } from "./component/configManager/constant";
export { CheckerFactory } from "./component/deps-checker/checkerFactory";
export {
  DepsCheckerEvent,
  TelemetryMessurement,
} from "./component/deps-checker/constant/telemetry";
export { CoreDepsLoggerAdapter } from "./component/deps-checker/coreDepsLoggerAdapter";
export { CoreDepsTelemetryAdapter } from "./component/deps-checker/coreDepsTelemetryAdapter";
export * from "./component/deps-checker/depsChecker";
export * from "./component/deps-checker/depsError";
export { DepsLogger, EmptyLogger } from "./component/deps-checker/depsLogger";
export { DepsManager } from "./component/deps-checker/depsManager";
export { DepsTelemetry, EmptyTelemetry } from "./component/deps-checker/depsTelemetry";
export { FuncToolChecker } from "./component/deps-checker/internal/funcToolChecker";
export { LtsNodeChecker } from "./component/deps-checker/internal/nodeChecker";
export { getPermissionMap } from "./component/driver/aad/permissions/index";
export { AppStudioClient } from "./component/driver/teamsApp/clients/appStudioClient";
export { AppDefinition } from "./component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
export { manifestUtils } from "./component/driver/teamsApp/utils/ManifestUtils";
export { pluginManifestUtils } from "./component/driver/teamsApp/utils/PluginManifestUtils";
export { generateScaffoldingSummary } from "./component/generator/copilotPlugin/helper";
export { HelperMethods } from "./component/generator/officeAddin/helperMethods";
export { DefaultTemplateGenerator } from "./component/generator/templates/templateGenerator";
export { getSampleFileInfo, runWithLimitedConcurrency } from "./component/generator/utils";
export * from "./component/local/constants";
export { LocalCertificateManager } from "./component/local/localCertificateManager";
export { LocalEnvManager } from "./component/local/localEnvManager";
export { LocalTelemetryReporter, TelemetryContext } from "./component/local/localTelemetryReporter";
export { loadTeamsFxDevScript } from "./component/local/packageJsonHelper";
export { Hub } from "./component/m365/constants";
export { PackageService } from "./component/m365/packageService";
export { MosServiceEndpoint, MosServiceScope } from "./component/m365/serviceConstant";
export { newResourceGroupOption, resourceGroupHelper } from "./component/utils/ResourceGroupHelper";
export { DotenvOutput, envUtil } from "./component/utils/envUtil";
export { metadataUtil } from "./component/utils/metadataUtil";
export { pathUtils } from "./component/utils/pathUtils";
export { FxCore } from "./core/FxCore";
export { CoreCallbackFunc } from "./core/callback";
export { CollaborationConstants } from "./core/collaborator";
export { environmentManager } from "./core/environment";
export { environmentNameManager } from "./core/environmentName";
export { PreProvisionResForVS, VersionCheckRes } from "./core/types";
export * from "./error/index";
export * from "./question/constants";
export * from "./question/inputs";
export * from "./question/options";
