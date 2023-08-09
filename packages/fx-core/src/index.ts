// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "reflect-metadata";
export * from "./common/correlator";
export * from "./common/deps-checker";
export * from "./common/featureFlags";
export * from "./common/globalState";
export { jsonUtils } from "./common/jsonUtils";
export * from "./common/local";
export * from "./common/m365/constants";
export { PackageService } from "./common/m365/packageService";
export * from "./common/m365/serviceConstant";
export * from "./common/permissionInterface";
export * from "./common/projectSettingsHelper";
export * from "./common/projectSettingsHelperV3";
export * from "./common/tools";
export { MetadataV3, VersionState } from "./common/versionMetadata";
export * from "./component/constants";
export * from "./component/migrate";
export { TelemetryUtils } from "./component/driver/teamsApp/utils/telemetry";
export { envUtil, DotenvOutput } from "./component/utils/envUtil";
export { metadataUtil } from "./component/utils/metadataUtil";
export { pathUtils } from "./component/utils/pathUtils";
export { CoreCallbackFunc, FxCore } from "./core/FxCore";
export { sampleProvider } from "./common/samples";
export { loadingOptionsPlaceholder, loadingDefaultPlaceholder } from "./common/utils";
export { AppStudioClient } from "./component/driver/teamsApp/clients/appStudioClient";
export { getPermissionMap } from "./component/driver/aad/permissions/index";
export { AppDefinition } from "./component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
export * from "./component/driver/teamsApp/utils/utils";
export { manifestUtils } from "./component/driver/teamsApp/utils/ManifestUtils";
export { CollaborationConstants } from "./core/collaborator";
export { environmentManager } from "./core/environment";
export * from "./core/error";
export { QuestionNames as CoreQuestionNames } from "./question/questionNames";
export * from "./core/types";
export * from "./error/index";
export * from "./ui/visitor";
export * from "./question";
export * from "./component/generator/copilotPlugin/helper";
