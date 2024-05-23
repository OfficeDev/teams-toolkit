// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "reflect-metadata";
export * from "./common/azureUtils";
export * from "./common/constants";
export * from "./common/correlator";
export * from "./common/featureFlags";
export * from "./common/globalState";
export * from "./common/jsonUtils";
export * from "./common/localizeUtils";
export * from "./common/permissionInterface";
export * from "./common/projectSettingsHelper";
export * from "./common/projectTypeChecker";
export * from "./common/requestUtils";
export * from "./common/samples";
export * from "./common/stringUtils";
export * from "./common/telemetry";
export * from "./common/tools";
export { MetadataV3, VersionState } from "./common/versionMetadata";
export { SummaryConstant } from "./component/configManager/constant";
export * from "./component/constants";
export * from "./component/deps-checker";
export { FuncToolChecker } from "./component/deps-checker/internal/funcToolChecker";
export { LtsNodeChecker } from "./component/deps-checker/internal/nodeChecker";
export { getPermissionMap } from "./component/driver/aad/permissions/index";
export { AppStudioClient } from "./component/driver/teamsApp/clients/appStudioClient";
export * from "./component/driver/teamsApp/constants";
export { AppDefinition } from "./component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
export { manifestUtils } from "./component/driver/teamsApp/utils/ManifestUtils";
export { pluginManifestUtils } from "./component/driver/teamsApp/utils/PluginManifestUtils";
export * from "./component/driver/teamsApp/utils/utils";
export * from "./component/generator/copilotPlugin/helper";
export { HelperMethods } from "./component/generator/officeAddin/helperMethods";
export { DefaultTemplateGenerator } from "./component/generator/templates/templateGenerator";
export * from "./component/generator/utils";
export * from "./component/local";
export { LocalCertificateManager } from "./component/local/localCertificateManager";
export * from "./component/m365/constants";
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
export * from "./core/types";
export * from "./error/index";
export * from "./question";
export { QuestionNames as CoreQuestionNames } from "./question/constants";
export * from "./question/util";
export * from "./ui/validationUtils";
export * from "./ui/visitor";
