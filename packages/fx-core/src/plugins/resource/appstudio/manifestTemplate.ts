// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  FxError,
  TeamsAppManifest,
  Result,
  err,
  ok,
  AppPackageFolderName,
  v3,
} from "@microsoft/teamsfx-api";
import { getAppDirectory } from "../../../common";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import {
  STATIC_TABS_MAX_ITEMS,
  MANIFEST_LOCAL,
  MANIFEST_TEMPLATE,
  TEAMS_APP_MANIFEST_TEMPLATE_V3,
  TEAMS_APP_MANIFEST_TEMPLATE_LOCAL_DEBUG_V3,
  STATIC_TABS_TPL_FOR_MULTI_ENV,
  STATIC_TABS_TPL_LOCAL_DEBUG,
  STATIC_TABS_TPL_EXISTING_APP,
  CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV,
  CONFIGURABLE_TABS_TPL_LOCAL_DEBUG,
  CONFIGURABLE_TABS_TPL_EXISTING_APP,
  BOTS_TPL_FOR_MULTI_ENV,
  BOTS_TPL_LOCAL_DEBUG,
  BOTS_TPL_EXISTING_APP,
  COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV,
  COMPOSE_EXTENSIONS_TPL_LOCAL_DEBUG,
  COMPOSE_EXTENSIONS_TPL_EXISTING_APP,
  TEAMS_APP_SHORT_NAME_MAX_LENGTH,
} from "./constants";
import { replaceConfigValue } from "./utils/utils";

export async function getManifestTemplatePath(
  projectRoot: string,
  isLocalDebug: boolean
): Promise<string> {
  const appDir = await getAppDirectory(projectRoot);
  return isLocalDebug ? `${appDir}/${MANIFEST_LOCAL}` : `${appDir}/${MANIFEST_TEMPLATE}`;
}

export async function init(projectRoot: string, appName: string): Promise<Result<any, FxError>> {
  const newAppPackageFolder = `${projectRoot}/templates/${AppPackageFolderName}`;
  await fs.ensureDir(newAppPackageFolder);

  let localManifestString = TEAMS_APP_MANIFEST_TEMPLATE_LOCAL_DEBUG_V3;
  const suffix = "-local-debug";
  let localAppName = appName;
  if (suffix.length + appName.length <= TEAMS_APP_SHORT_NAME_MAX_LENGTH) {
    localAppName = localAppName + suffix;
  }
  localManifestString = replaceConfigValue(localManifestString, "appName", localAppName);
  const localManifest = JSON.parse(localManifestString);
  await saveManifest(projectRoot, localManifest, true);

  let remoteManifestString = TEAMS_APP_MANIFEST_TEMPLATE_V3;
  remoteManifestString = replaceConfigValue(remoteManifestString, "appName", appName);
  const remoteManifest = JSON.parse(remoteManifestString);
  await saveManifest(projectRoot, remoteManifest, false);

  return ok(undefined);
}

export async function loadManifest(
  projectRoot: string,
  isLocalDebug: boolean
): Promise<Result<TeamsAppManifest, FxError>> {
  const manifestFilePath = await getManifestTemplatePath(projectRoot, isLocalDebug);
  if (!(await fs.pathExists(manifestFilePath))) {
    return err(
      AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(manifestFilePath)
      )
    );
  }

  try {
    const manifest = await fs.readJson(manifestFilePath);
    return ok(manifest);
  } catch (e: any) {
    if (e.stack && e.stack.startsWith("SyntaxError")) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.ManifestLoadFailedError.name,
          AppStudioError.ManifestLoadFailedError.message(
            `Failed to load manifest file from ${manifestFilePath}, due to ${e.message}`
          )
        )
      );
    }
    return err(
      AppStudioResultFactory.SystemError(
        AppStudioError.ManifestLoadFailedError.name,
        AppStudioError.ManifestLoadFailedError.message(
          `Failed to load manifest file from ${manifestFilePath}, due to ${e.message}`
        )
      )
    );
  }
}

export async function saveManifest(
  projectRoot: string,
  manifest: TeamsAppManifest,
  isLocalDebug: boolean
): Promise<Result<any, FxError>> {
  const manifestFilePath = await getManifestTemplatePath(projectRoot, isLocalDebug);
  await fs.writeFile(manifestFilePath, JSON.stringify(manifest, null, 4));
  return ok(manifestFilePath);
}

export async function capabilityExceedLimit(
  projectRoot: string,
  capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
): Promise<Result<boolean, FxError>> {
  const localManifest = await loadManifest(projectRoot, true);
  if (localManifest.isErr()) {
    return err(localManifest.error);
  }

  const remoteManifest = await loadManifest(projectRoot, false);
  if (remoteManifest.isErr()) {
    return err(remoteManifest.error);
  }

  let localExceed,
    remoteExceed = false;
  switch (capability) {
    case "staticTab":
      localExceed =
        localManifest.value.staticTabs !== undefined &&
        localManifest.value.staticTabs!.length >= STATIC_TABS_MAX_ITEMS;
      remoteExceed =
        remoteManifest.value.staticTabs !== undefined &&
        remoteManifest.value.staticTabs!.length >= STATIC_TABS_MAX_ITEMS;
      return ok(localExceed || remoteExceed);
    case "configurableTab":
      localExceed =
        localManifest.value.configurableTabs !== undefined &&
        localManifest.value.configurableTabs!.length >= 1;
      remoteExceed =
        remoteManifest.value.configurableTabs !== undefined &&
        remoteManifest.value.configurableTabs!.length >= 1;
      return ok(localExceed || remoteExceed);
    case "Bot":
      localExceed = localManifest.value.bots !== undefined && localManifest.value.bots!.length >= 1;
      remoteExceed =
        remoteManifest.value.bots !== undefined && remoteManifest.value.bots!.length >= 1;
      return ok(localExceed || remoteExceed);
    case "MessageExtension":
      localExceed =
        localManifest.value.composeExtensions !== undefined &&
        localManifest.value.composeExtensions!.length >= 1;
      remoteExceed =
        remoteManifest.value.composeExtensions !== undefined &&
        remoteManifest.value.composeExtensions!.length >= 1;
      return ok(localExceed || remoteExceed);
    default:
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.InvalidCapabilityError.name,
          AppStudioError.InvalidCapabilityError.message(capability)
        )
      );
  }
}

export async function addCapabilities(
  projectRoot: string,
  capabilities: v3.ManifestCapability[]
): Promise<Result<any, FxError>> {
  const localManifestRes = await loadManifest(projectRoot, true);
  if (localManifestRes.isErr()) {
    return err(localManifestRes.error);
  }
  const localManifest = localManifestRes.value;

  const remoteManifestRes = await loadManifest(projectRoot, false);
  if (remoteManifestRes.isErr()) {
    return err(remoteManifestRes.error);
  }
  const remoteManifest = remoteManifestRes.value;

  let staticTabIndex = remoteManifest.staticTabs?.length ?? 0;

  capabilities.map((capability) => {
    switch (capability.name) {
      case "staticTab":
        if (!localManifest.staticTabs) {
          Object.assign(localManifest, { staticTabs: [] });
        }
        if (!remoteManifest.staticTabs) {
          Object.assign(remoteManifest, { staticTabs: [] });
        }
        if (capability.snippet) {
          localManifest.staticTabs!.push(capability.snippet.local);
          remoteManifest.staticTabs!.push(capability.snippet.remote);
        } else {
          if (capability.existingApp) {
            STATIC_TABS_TPL_EXISTING_APP[0].entityId = "index" + staticTabIndex;
            localManifest.staticTabs = localManifest.staticTabs!.concat(
              STATIC_TABS_TPL_EXISTING_APP
            );
            remoteManifest.staticTabs = remoteManifest.staticTabs!.concat(
              STATIC_TABS_TPL_EXISTING_APP
            );
          } else {
            STATIC_TABS_TPL_LOCAL_DEBUG[0].entityId = "index" + staticTabIndex;
            STATIC_TABS_TPL_FOR_MULTI_ENV[0].entityId = "index" + staticTabIndex;
            localManifest.staticTabs = localManifest.staticTabs!.concat(
              STATIC_TABS_TPL_LOCAL_DEBUG
            );
            remoteManifest.staticTabs = remoteManifest.staticTabs!.concat(
              STATIC_TABS_TPL_FOR_MULTI_ENV
            );
          }
          staticTabIndex++;
        }
        break;
      case "configurableTab":
        if (!localManifest.configurableTabs) {
          Object.assign(localManifest, { configurableTabs: [] });
        }
        if (!remoteManifest.configurableTabs) {
          Object.assign(remoteManifest, { configurableTabs: [] });
        }
        if (capability.snippet) {
          localManifest.configurableTabs!.push(capability.snippet.local);
          remoteManifest.configurableTabs!.push(capability.snippet.remote);
        } else {
          if (capability.existingApp) {
            localManifest.configurableTabs = localManifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_EXISTING_APP
            );
            remoteManifest.configurableTabs = remoteManifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_EXISTING_APP
            );
          } else {
            localManifest.configurableTabs = localManifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_LOCAL_DEBUG
            );
            remoteManifest.configurableTabs = remoteManifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV
            );
          }
        }
        break;
      case "Bot":
        if (!localManifest.bots) {
          Object.assign(localManifest, { bots: [] });
        }
        if (!remoteManifest.bots) {
          Object.assign(remoteManifest, { bots: [] });
        }
        if (capability.snippet) {
          localManifest.bots!.push(capability.snippet.local);
          remoteManifest.bots!.push(capability.snippet.remote);
        } else {
          if (capability.existingApp) {
            localManifest.bots = localManifest.bots!.concat(BOTS_TPL_EXISTING_APP);
            remoteManifest.bots = remoteManifest.bots!.concat(BOTS_TPL_EXISTING_APP);
          } else {
            localManifest.bots = localManifest.bots!.concat(BOTS_TPL_LOCAL_DEBUG);
            remoteManifest.bots = remoteManifest.bots!.concat(BOTS_TPL_FOR_MULTI_ENV);
          }
        }
        break;
      case "MessageExtension":
        if (!localManifest.composeExtensions) {
          Object.assign(localManifest, { composeExtensions: [] });
        }
        if (!remoteManifest.composeExtensions) {
          Object.assign(remoteManifest, { composeExtensions: [] });
        }
        if (capability.snippet) {
          localManifest.composeExtensions!.push(capability.snippet.local);
          remoteManifest.composeExtensions!.push(capability.snippet.remote);
        } else {
          if (capability.existingApp) {
            localManifest.composeExtensions = localManifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_EXISTING_APP
            );
            remoteManifest.composeExtensions = remoteManifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_EXISTING_APP
            );
          } else {
            localManifest.composeExtensions = localManifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_LOCAL_DEBUG
            );
            remoteManifest.composeExtensions = remoteManifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV
            );
          }
        }
        break;
    }
  });
  let res = await saveManifest(projectRoot, localManifest, true);
  if (res.isErr()) {
    return err(res.error);
  }
  res = await saveManifest(projectRoot, remoteManifest, false);
  if (res.isErr()) {
    return err(res.error);
  }
  return ok(undefined);
}
