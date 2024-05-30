// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

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
export * from "./common/globalState";
export { getDefaultString, getLocalizedString } from "./common/localizeUtils";
export * from "./common/permissionInterface";
export * from "./common/projectSettingsHelper";
export * from "./common/projectTypeChecker";
export * from "./common/requestUtils";
export * from "./common/samples";
export * from "./common/stringUtils";
export { telemetryUtils } from "./common/telemetry";
export * from "./common/tools";
export { MetadataV3, VersionState } from "./common/versionMetadata";
export { SummaryConstant } from "./component/configManager/constant";
export * from "./component/deps-checker";
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
export { Hub } from "./component/m365/constants";
export { PackageService } from "./component/m365/packageService";
export * from "./component/m365/serviceConstant";
export * from "./component/migrate";
export * from "./component/utils/ResourceGroupHelper";
export { DotenvOutput, envUtil } from "./component/utils/envUtil";
export { metadataUtil } from "./component/utils/metadataUtil";
export { pathUtils } from "./component/utils/pathUtils";
export { FxCore } from "./core/FxCore";
export { CoreCallbackFunc } from "./core/callback";
export { CollaborationConstants } from "./core/collaborator";
export { environmentManager } from "./core/environment";
export { environmentNameManager } from "./core/environmentName";
export * from "./core/error";
export { isVideoFilterProject } from "./core/middleware/videoFilterAppBlocker";
export { VersionCheckRes } from "./core/types";
export * from "./error/index";
export * from "./question/constants";
export { QuestionNames as CoreQuestionNames } from "./question/constants";
export * from "./question/inputs";
export * from "./question/options";
