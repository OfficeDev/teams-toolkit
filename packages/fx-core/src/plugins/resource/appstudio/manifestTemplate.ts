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
  IStaticTab,
  Inputs,
} from "@microsoft/teamsfx-api";
import {
  getAppDirectory,
  deepCopy,
  isBotNotificationEnabled,
} from "../../../common";
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
  MANIFEST_TEMPLATE_CONSOLIDATE,
  WEB_APPLICATION_INFO_MULTI_ENV,
  WEB_APPLICATION_INFO_LOCAL_DEBUG,
  DEFAULT_DEVELOPER_WEBSITE_URL,
  DEFAULT_DEVELOPER_PRIVACY_URL,
  DEFAULT_DEVELOPER_TERM_OF_USE_URL,
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE,
  BOTS_TPL_FOR_NOTIFICATION,
} from "./constants";
import { replaceConfigValue } from "./utils/utils";
import { AzureSolutionQuestionNames, BotScenario } from "../../solution/fx-solution/question";

export async function getManifestTemplatePath(
  projectRoot: string,
  isLocalDebug = false
): Promise<string> {
  const appDir = await getAppDirectory(projectRoot);
  return `${appDir}/${MANIFEST_TEMPLATE_CONSOLIDATE}`;
}

export async function init(
  projectRoot: string,
  appName: string,
  existingApp: boolean
): Promise<Result<any, FxError>> {
  const newAppPackageFolder = `${projectRoot}/templates/${AppPackageFolderName}`;
  await fs.ensureDir(newAppPackageFolder);

  const manifestString = TEAMS_APP_MANIFEST_TEMPLATE_V3;
  const manifest = JSON.parse(manifestString);
  if (existingApp) {
    manifest.developer = {
      name: "Teams App, Inc.",
      websiteUrl: DEFAULT_DEVELOPER_WEBSITE_URL,
      privacyUrl: DEFAULT_DEVELOPER_PRIVACY_URL,
      termsOfUseUrl: DEFAULT_DEVELOPER_TERM_OF_USE_URL,
    };
  }
  await saveManifest(projectRoot, manifest);

  return ok(undefined);
}

export async function loadManifest(
  projectRoot: string,
  isLocalDebug = false
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
  isLocalDebug = false
): Promise<Result<any, FxError>> {
  const manifestFilePath = await getManifestTemplatePath(projectRoot, isLocalDebug);
  await fs.writeFile(manifestFilePath, JSON.stringify(manifest, null, 4));
  return ok(manifestFilePath);
}

/**
 * Only works for manifest.template.json
 * @param projectRoot
 * @returns
 */
export async function getCapabilities(projectRoot: string): Promise<Result<string[], FxError>> {
  const manifestRes = await loadManifest(projectRoot);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const capabilities: string[] = [];
  if (manifestRes.value.staticTabs && manifestRes.value.staticTabs!.length > 0) {
    capabilities.push("staticTab");
  }
  if (manifestRes.value.configurableTabs && manifestRes.value.configurableTabs!.length > 0) {
    capabilities.push("configurableTab");
  }
  if (manifestRes.value.bots && manifestRes.value.bots!.length > 0) {
    capabilities.push("Bot");
  }
  if (manifestRes.value.composeExtensions) {
    capabilities.push("MessageExtension");
  }
  return ok(capabilities);
}

export async function capabilityExceedLimit(
  projectRoot: string,
  capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
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
    case "WebApplicationInfo":
      return ok(false);
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
  capabilities: v3.ManifestCapability[],
  inputs: Inputs
): Promise<Result<any, FxError>> {
  const remoteManifestRes = await loadManifest(projectRoot, false);
  if (remoteManifestRes.isErr()) {
    return err(remoteManifestRes.error);
  }
  const remoteManifest = remoteManifestRes.value;

  let staticTabIndex = remoteManifest.staticTabs?.length ?? 0;

  capabilities.map((capability) => {
    switch (capability.name) {
      case "staticTab":
        if (!remoteManifest.staticTabs) {
          Object.assign(remoteManifest, { staticTabs: [] });
        }
        if (capability.snippet) {
          remoteManifest.staticTabs!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            const template = deepCopy(STATIC_TABS_TPL_EXISTING_APP[0]);
            template.entityId = "index" + staticTabIndex;
            remoteManifest.staticTabs!.push(template);
          } else {
            const template = deepCopy(STATIC_TABS_TPL_FOR_MULTI_ENV[0]);
            template.entityId = "index" + staticTabIndex;
            remoteManifest.staticTabs!.push(template);
          }
          staticTabIndex++;
        }
        break;
      case "configurableTab":
        if (!remoteManifest.configurableTabs) {
          Object.assign(remoteManifest, { configurableTabs: [] });
        }
        if (capability.snippet) {
          remoteManifest.configurableTabs!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            remoteManifest.configurableTabs = remoteManifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_EXISTING_APP
            );
          } else {
            remoteManifest.configurableTabs = remoteManifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV
            );
          }
        }
        break;
      case "Bot":
        if (!remoteManifest.bots) {
          Object.assign(remoteManifest, { bots: [] });
        }
        if (capability.snippet) {
          remoteManifest.bots!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            remoteManifest.bots = remoteManifest.bots!.concat(BOTS_TPL_EXISTING_APP);
          } else {
            if (remoteManifest.bots === undefined) {
              remoteManifest.bots = [];
            }

            if (isBotNotificationEnabled()) {
              const scenariosRaw = inputs[AzureSolutionQuestionNames.Scenarios];
              const scenarios = Array.isArray(scenariosRaw) ? scenariosRaw : [];

              if (scenarios.includes(BotScenario.CommandAndResponseBot)) {
                // command and response bot
                remoteManifest.bots = remoteManifest.bots.concat(BOTS_TPL_FOR_COMMAND_AND_RESPONSE);
              } else if (scenarios.includes(BotScenario.NotificationBot)) {
                // notification
                remoteManifest.bots = remoteManifest.bots.concat(BOTS_TPL_FOR_NOTIFICATION);
              } else {
                // legacy bot
                remoteManifest.bots = remoteManifest.bots.concat(BOTS_TPL_FOR_MULTI_ENV);
              }
            } else {
              remoteManifest.bots = remoteManifest.bots.concat(BOTS_TPL_FOR_MULTI_ENV);
            }
          }
        }
        break;
      case "MessageExtension":
        if (!remoteManifest.composeExtensions) {
          Object.assign(remoteManifest, { composeExtensions: [] });
        }
        if (capability.snippet) {
          remoteManifest.composeExtensions!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            remoteManifest.composeExtensions = remoteManifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_EXISTING_APP
            );
          } else {
            remoteManifest.composeExtensions = remoteManifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV
            );
          }
        }
        break;
      case "WebApplicationInfo":
        if (capability.snippet) {
          remoteManifest.webApplicationInfo = capability.snippet;
        } else {
          remoteManifest.webApplicationInfo = WEB_APPLICATION_INFO_MULTI_ENV;
        }
        break;
    }
  });
  const res = await saveManifest(projectRoot, remoteManifest, false);
  if (res.isErr()) {
    return err(res.error);
  }

  return ok(undefined);
}

export async function updateCapability(
  projectRoot: string,
  capability: v3.ManifestCapability
): Promise<Result<any, FxError>> {
  const manifestRes = await loadManifest(projectRoot, false);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const manifest = manifestRes.value;
  switch (capability.name) {
    case "staticTab":
      // find the corresponding static Tab with entity id
      const entityId = (capability.snippet as IStaticTab).entityId;
      const index = manifest.staticTabs?.map((x) => x.entityId).indexOf(entityId);
      if (index !== undefined && index !== -1) {
        manifest.staticTabs![index] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.StaticTabNotExistError.name,
            AppStudioError.StaticTabNotExistError.message(entityId)
          )
        );
      }
      break;
    case "configurableTab":
      if (manifest.configurableTabs && manifest.configurableTabs.length) {
        manifest.configurableTabs[0] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "Bot":
      if (manifest.bots && manifest.bots.length > 0) {
        manifest.bots[0] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "MessageExtension":
      if (manifest.composeExtensions && manifest.composeExtensions.length > 0) {
        manifest.composeExtensions[0] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "WebApplicationInfo":
      manifest.webApplicationInfo = capability.snippet;
      break;
  }

  const res = await saveManifest(projectRoot, manifest, false);
  if (res.isErr()) {
    return err(res.error);
  }
  return ok(undefined);
}

export async function deleteCapability(
  projectRoot: string,
  capability: v3.ManifestCapability
): Promise<Result<any, FxError>> {
  const manifestRes = await loadManifest(projectRoot, false);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const manifest = manifestRes.value;
  switch (capability.name) {
    case "staticTab":
      // find the corresponding static Tab with entity id
      const entityId = (capability.snippet! as IStaticTab).entityId;
      const index = manifest.staticTabs?.map((x) => x.entityId).indexOf(entityId);
      if (index !== undefined && index !== -1) {
        manifest.staticTabs!.slice(index, 1);
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.StaticTabNotExistError.name,
            AppStudioError.StaticTabNotExistError.message(entityId)
          )
        );
      }
      break;
    case "configurableTab":
      if (manifest.configurableTabs && manifest.configurableTabs.length > 0) {
        manifest.configurableTabs = [];
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "Bot":
      if (manifest.bots && manifest.bots.length > 0) {
        manifest.bots = [];
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "MessageExtension":
      if (manifest.composeExtensions && manifest.composeExtensions.length > 0) {
        manifest.composeExtensions = [];
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "WebApplicationInfo":
      manifest.webApplicationInfo = undefined;
      break;
  }
  const res = await saveManifest(projectRoot, manifest, false);
  if (res.isErr()) {
    return err(res.error);
  }
  return ok(undefined);
}
