// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "reflect-metadata";
export * from "./core/FxCore";
export * from "./common/tools";
export * from "./common/correlator";
export * from "./common/local";
export * from "./common/deps-checker";
export * from "./component/debugHandler";
export * from "./common/samples";
export * from "./core/error";
export * from "./common/globalState";
export * from "./common/permissionInterface";
export * from "./common/featureFlags";
export * from "./component/migrate";
export * from "./common/projectSettingsHelperV3";
export * from "./component/constants";
export * from "./component/resource/appManifest/utils/utils";
export * from "./component/resource/azureSql/constants";
export { envUtil } from "./component/utils/envUtil";
export { environmentManager, EnvStateFiles } from "./core/environment";
export { isValidProject, isExistingTabApp } from "./common/projectSettingsHelper";
export { getPermissionMap } from "./component/resource/aadApp/permissions/index";
export { AppStudioClient } from "./component/resource/appManifest/appStudioClient";
export { AppDefinition } from "./component/resource/appManifest/interfaces/appDefinition";
export { FeatureId } from "./component/question";
export { CollaborationConstants } from "./core/collaborator";
