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
import { getAppDirectory, deepCopy } from "../../../common/tools";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import {
  STATIC_TABS_MAX_ITEMS,
  TEAMS_APP_MANIFEST_TEMPLATE_V3,
  STATIC_TABS_TPL_FOR_MULTI_ENV,
  STATIC_TABS_TPL_EXISTING_APP,
  CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV,
  CONFIGURABLE_TABS_TPL_EXISTING_APP,
  BOTS_TPL_FOR_MULTI_ENV,
  BOTS_TPL_EXISTING_APP,
  COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV,
  COMPOSE_EXTENSIONS_TPL_EXISTING_APP,
  MANIFEST_TEMPLATE_CONSOLIDATE,
  WEB_APPLICATION_INFO_MULTI_ENV,
  DEFAULT_DEVELOPER,
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE,
  BOTS_TPL_FOR_NOTIFICATION,
} from "./constants";
import { AzureSolutionQuestionNames, BotScenario } from "../../solution/fx-solution/question";
import { isBotNotificationEnabled } from "../../../common/featureFlags";

export async function getManifestTemplatePath(projectRoot: string): Promise<string> {
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
    manifest.developer = DEFAULT_DEVELOPER;
  }
  await saveManifest(projectRoot, manifest);

  return ok(undefined);
}

export async function loadManifest(
  projectRoot: string
): Promise<Result<TeamsAppManifest, FxError>> {
  const manifestFilePath = await getManifestTemplatePath(projectRoot);
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
  manifest: TeamsAppManifest
): Promise<Result<any, FxError>> {
  const manifestFilePath = await getManifestTemplatePath(projectRoot);
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
  const manifest = await loadManifest(projectRoot);
  if (manifest.isErr()) {
    return err(manifest.error);
  }

  let exceed = false;
  switch (capability) {
    case "staticTab":
      exceed =
        manifest.value.staticTabs !== undefined &&
        manifest.value.staticTabs!.length >= STATIC_TABS_MAX_ITEMS;
      return ok(exceed);
    case "configurableTab":
      exceed =
        manifest.value.configurableTabs !== undefined &&
        manifest.value.configurableTabs!.length >= 1;
      return ok(exceed);
    case "Bot":
      exceed = manifest.value.bots !== undefined && manifest.value.bots!.length >= 1;
      return ok(exceed);
    case "MessageExtension":
      exceed =
        manifest.value.composeExtensions !== undefined &&
        manifest.value.composeExtensions!.length >= 1;
      return ok(exceed);
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
  const manifestRes = await loadManifest(projectRoot);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const manifest = manifestRes.value;

  let staticTabIndex = manifest.staticTabs?.length ?? 0;

  capabilities.map((capability) => {
    switch (capability.name) {
      case "staticTab":
        if (!manifest.staticTabs) {
          Object.assign(manifest, { staticTabs: [] });
        }
        if (capability.snippet) {
          manifest.staticTabs!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            const template = deepCopy(STATIC_TABS_TPL_EXISTING_APP[0]);
            template.entityId = "index" + staticTabIndex;
            manifest.staticTabs!.push(template);
          } else {
            const template = deepCopy(STATIC_TABS_TPL_FOR_MULTI_ENV[0]);
            template.entityId = "index" + staticTabIndex;
            manifest.staticTabs!.push(template);
            if (
              manifest.validDomains?.indexOf("{{state.fx-resource-frontend-hosting.domain}}") == -1
            ) {
              manifest.validDomains?.push("{{state.fx-resource-frontend-hosting.domain}}");
            }
          }
          staticTabIndex++;
        }
        break;
      case "configurableTab":
        if (!manifest.configurableTabs) {
          Object.assign(manifest, { configurableTabs: [] });
        }
        if (capability.snippet) {
          manifest.configurableTabs!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            manifest.configurableTabs = manifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_EXISTING_APP
            );
          } else {
            manifest.configurableTabs = manifest.configurableTabs!.concat(
              CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV
            );
            if (
              manifest.validDomains?.indexOf("{{state.fx-resource-frontend-hosting.domain}}") == -1
            ) {
              manifest.validDomains?.push("{{state.fx-resource-frontend-hosting.domain}}");
            }
          }
        }
        break;
      case "Bot":
        if (!manifest.bots) {
          Object.assign(manifest, { bots: [] });
        }
        if (capability.snippet) {
          manifest.bots!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            manifest.bots = manifest.bots!.concat(BOTS_TPL_EXISTING_APP);
          } else {
            if (manifest.bots === undefined) {
              manifest.bots = [];
            }

            if (isBotNotificationEnabled()) {
              const scenariosRaw = inputs[AzureSolutionQuestionNames.Scenarios];
              const scenarios = Array.isArray(scenariosRaw) ? scenariosRaw : [];

              if (scenarios.includes(BotScenario.CommandAndResponseBot)) {
                // command and response bot
                manifest.bots = manifest.bots.concat(BOTS_TPL_FOR_COMMAND_AND_RESPONSE);
              } else if (scenarios.includes(BotScenario.NotificationBot)) {
                // notification
                manifest.bots = manifest.bots.concat(BOTS_TPL_FOR_NOTIFICATION);
              } else {
                // legacy bot
                manifest.bots = manifest.bots.concat(BOTS_TPL_FOR_MULTI_ENV);
              }
            } else {
              manifest.bots = manifest.bots.concat(BOTS_TPL_FOR_MULTI_ENV);
            }

            manifest.validDomains?.push("{{state.fx-resource-bot.validDomain}}");
          }
        }
        break;
      case "MessageExtension":
        if (!manifest.composeExtensions) {
          Object.assign(manifest, { composeExtensions: [] });
        }
        if (capability.snippet) {
          manifest.composeExtensions!.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            manifest.composeExtensions = manifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_EXISTING_APP
            );
          } else {
            manifest.composeExtensions = manifest.composeExtensions!.concat(
              COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV
            );
          }
        }
        break;
      case "WebApplicationInfo":
        if (capability.snippet) {
          manifest.webApplicationInfo = capability.snippet;
        } else {
          manifest.webApplicationInfo = WEB_APPLICATION_INFO_MULTI_ENV;
        }
        break;
    }
  });
  const res = await saveManifest(projectRoot, manifest);
  if (res.isErr()) {
    return err(res.error);
  }

  return ok(undefined);
}

export async function updateCapability(
  projectRoot: string,
  capability: v3.ManifestCapability
): Promise<Result<any, FxError>> {
  const manifestRes = await loadManifest(projectRoot);
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

  const res = await saveManifest(projectRoot, manifest);
  if (res.isErr()) {
    return err(res.error);
  }
  return ok(undefined);
}

export async function deleteCapability(
  projectRoot: string,
  capability: v3.ManifestCapability
): Promise<Result<any, FxError>> {
  const manifestRes = await loadManifest(projectRoot);
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
  const res = await saveManifest(projectRoot, manifest);
  if (res.isErr()) {
    return err(res.error);
  }
  return ok(undefined);
}
