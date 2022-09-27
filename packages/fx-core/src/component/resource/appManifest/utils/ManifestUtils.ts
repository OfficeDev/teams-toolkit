// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FxError,
  ok,
  Result,
  TeamsAppManifest,
  err,
  InputsWithProjectPath,
  v3,
  IStaticTab,
  ContextV3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { getProjectTemplatesFolderPath } from "../../../../common/utils";
import { convertManifestTemplateToV2, convertManifestTemplateToV3 } from "../../../migrate";
import { AppStudioError } from "../errors";
import { AppStudioResultFactory } from "../results";
import { cloneDeep } from "lodash";
import {
  BOTS_TPL_EXISTING_APP,
  COMPOSE_EXTENSIONS_TPL_EXISTING_APP,
  CONFIGURABLE_TABS_TPL_EXISTING_APP,
  DEFAULT_DEVELOPER,
  MANIFEST_TEMPLATE_CONSOLIDATE,
  STATIC_TABS_MAX_ITEMS,
  STATIC_TABS_TPL_EXISTING_APP,
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3,
  BOTS_TPL_FOR_NOTIFICATION_V3,
  BOTS_TPL_V3,
  COMPOSE_EXTENSIONS_TPL_M365_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  CONFIGURABLE_TABS_TPL_V3,
  STATIC_TABS_TPL_V3,
  WEB_APPLICATION_INFO_V3,
} from "../constants";
import {
  BotScenario,
  CommandAndResponseOptionItem,
  NotificationOptionItem,
  WorkflowOptionItem,
} from "../../../../plugins/solution/fx-solution/question";
import { getCustomizedKeys } from "./utils";
import { TelemetryPropertyKey } from "./telemetry";
import Mustache from "mustache";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { HelpLinks } from "../../../../common/constants";
import { ComponentNames } from "../../../constants";
import { compileHandlebarsTemplateString, getAppDirectory } from "../../../../common/tools";
import { hasTab } from "../../../../common/projectSettingsHelperV3";
export class ManifestUtils {
  async readAppManifest(projectPath: string): Promise<Result<TeamsAppManifest, FxError>> {
    const filePath = await this.getTeamsAppManifestPath(projectPath);
    if (!(await fs.pathExists(filePath))) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(filePath)
        )
      );
    }
    const content = await fs.readFile(filePath, { encoding: "utf-8" });
    const contentV3 = convertManifestTemplateToV3(content);
    const manifest = JSON.parse(contentV3) as TeamsAppManifest;
    return ok(manifest);
  }

  async writeAppManifest(
    appManifest: TeamsAppManifest,
    projectPath: string
  ): Promise<Result<undefined, FxError>> {
    const filePath = await this.getTeamsAppManifestPath(projectPath);
    const content = JSON.stringify(appManifest, undefined, 4);
    const contentV2 = convertManifestTemplateToV2(content);
    await fs.writeFile(filePath, contentV2);
    return ok(undefined);
  }

  async getTeamsAppManifestPath(projectPath: string): Promise<string> {
    const templateFolder = await getProjectTemplatesFolderPath(projectPath);
    const filePath = path.join(templateFolder, "appPackage", "manifest.template.json");
    return filePath;
  }

  async addCapabilities(
    inputs: InputsWithProjectPath,
    capabilities: v3.ManifestCapability[],
    isM365 = false
  ): Promise<Result<undefined, FxError>> {
    const appManifestRes = await this.readAppManifest(inputs.projectPath);
    if (appManifestRes.isErr()) return err(appManifestRes.error);
    const appManifest = appManifestRes.value;
    for (const capability of capabilities) {
      const exceedLimit = this._capabilityExceedLimit(appManifest, capability.name);
      if (exceedLimit) {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.CapabilityExceedLimitError.name,
            AppStudioError.CapabilityExceedLimitError.message(capability.name)
          )
        );
      }
      let staticTabIndex = appManifest.staticTabs?.length ?? 0;
      switch (capability.name) {
        case "staticTab":
          appManifest.staticTabs = appManifest.staticTabs || [];
          if (capability.snippet) {
            appManifest.staticTabs.push(capability.snippet);
          } else {
            if (capability.existingApp) {
              const template = cloneDeep(STATIC_TABS_TPL_EXISTING_APP[0]);
              template.entityId = "index" + staticTabIndex;
              appManifest.staticTabs.push(template);
            } else {
              const template = cloneDeep(STATIC_TABS_TPL_V3[0]);
              template.entityId = "index" + staticTabIndex;
              appManifest.staticTabs.push(template);
            }
            staticTabIndex++;
          }
          break;
        case "configurableTab":
          appManifest.configurableTabs = appManifest.configurableTabs || [];
          if (capability.snippet) {
            appManifest.configurableTabs.push(capability.snippet);
          } else {
            if (capability.existingApp) {
              appManifest.configurableTabs = appManifest.configurableTabs.concat(
                CONFIGURABLE_TABS_TPL_EXISTING_APP
              );
            } else {
              appManifest.configurableTabs =
                appManifest.configurableTabs.concat(CONFIGURABLE_TABS_TPL_V3);
            }
          }
          break;
        case "Bot":
          appManifest.bots = appManifest.bots || [];
          if (capability.snippet) {
            appManifest.bots.push(capability.snippet);
          } else {
            if (capability.existingApp) {
              appManifest.bots = appManifest.bots.concat(BOTS_TPL_EXISTING_APP);
            } else {
              // import CoreQuestionNames introduces dependency cycle and breaks the whole program
              // inputs[CoreQuestionNames.Features]
              if (inputs.features) {
                const feature = inputs.features;
                if (
                  feature === CommandAndResponseOptionItem.id ||
                  feature == WorkflowOptionItem.id
                ) {
                  // command and response bot or workflow bot
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3);
                } else if (feature === NotificationOptionItem.id) {
                  // notification
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_NOTIFICATION_V3);
                } else {
                  // legacy bot
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_V3);
                }
              } else if (inputs.scenarios) {
                const scenariosRaw = inputs.scenarios;
                const scenarios = Array.isArray(scenariosRaw) ? scenariosRaw : [];
                if (
                  scenarios.includes(BotScenario.CommandAndResponseBot) ||
                  scenarios.includes(BotScenario.WorkflowBot)
                ) {
                  // command and response bot or workflow bot
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3);
                } else if (scenarios.includes(BotScenario.NotificationBot)) {
                  // notification
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_NOTIFICATION_V3);
                } else {
                  // legacy bot
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_V3);
                }
              } else {
                appManifest.bots = appManifest.bots.concat(BOTS_TPL_V3);
              }
            }
          }
          break;
        case "MessageExtension":
          appManifest.composeExtensions = appManifest.composeExtensions || [];
          if (capability.snippet) {
            appManifest.composeExtensions.push(capability.snippet);
          } else {
            if (capability.existingApp) {
              appManifest.composeExtensions = appManifest.composeExtensions.concat(
                COMPOSE_EXTENSIONS_TPL_EXISTING_APP
              );
            } else {
              appManifest.composeExtensions = appManifest.composeExtensions.concat(
                isM365 ? COMPOSE_EXTENSIONS_TPL_M365_V3 : COMPOSE_EXTENSIONS_TPL_V3
              );
            }
          }
          break;
        case "WebApplicationInfo":
          if (capability.snippet) {
            appManifest.webApplicationInfo = capability.snippet;
          } else {
            appManifest.webApplicationInfo = WEB_APPLICATION_INFO_V3;
          }
          break;
      }
    }
    if (inputs.validDomain && !appManifest.validDomains?.includes(inputs.validDomain)) {
      appManifest.validDomains?.push(inputs.validDomain);
    }
    const writeRes = await this.writeAppManifest(appManifest, inputs.projectPath);
    if (writeRes.isErr()) return err(writeRes.error);
    return ok(undefined);
  }

  async updateCapability(
    projectPath: string,
    capability: v3.ManifestCapability
  ): Promise<Result<undefined, FxError>> {
    const appManifestRes = await this.readAppManifest(projectPath);
    if (appManifestRes.isErr()) return err(appManifestRes.error);
    const manifest = appManifestRes.value;
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
    const writeRes = await this.writeAppManifest(manifest, projectPath);
    if (writeRes.isErr()) return err(writeRes.error);
    return ok(undefined);
  }

  async deleteCapability(
    projectPath: string,
    capability: v3.ManifestCapability
  ): Promise<Result<undefined, FxError>> {
    const appManifestRes = await this.readAppManifest(projectPath);
    if (appManifestRes.isErr()) return err(appManifestRes.error);
    const manifest = appManifestRes.value;
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
    const writeRes = await this.writeAppManifest(manifest, projectPath);
    if (writeRes.isErr()) return err(writeRes.error);
    return ok(undefined);
  }
  async capabilityExceedLimit(
    projectPath: string,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ): Promise<Result<boolean, FxError>> {
    const manifestRes = await this.readAppManifest(projectPath);
    if (manifestRes.isErr()) return err(manifestRes.error);
    return ok(this._capabilityExceedLimit(manifestRes.value, capability));
  }
  _capabilityExceedLimit(
    manifest: TeamsAppManifest,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ): boolean {
    switch (capability) {
      case "staticTab":
        return (
          manifest.staticTabs !== undefined && manifest.staticTabs!.length >= STATIC_TABS_MAX_ITEMS
        );
      case "configurableTab":
        return manifest.configurableTabs !== undefined && manifest.configurableTabs!.length >= 1;
      case "Bot":
        return manifest.bots !== undefined && manifest.bots!.length >= 1;
      case "MessageExtension":
        return manifest.composeExtensions !== undefined && manifest.composeExtensions!.length >= 1;
      case "WebApplicationInfo":
        return false;
      default:
        return false;
    }
  }
  _getCapabilities(template: TeamsAppManifest): Result<string[], FxError> {
    const capabilities: string[] = [];
    if (template.staticTabs && template.staticTabs!.length > 0) {
      capabilities.push("staticTab");
    }
    if (template.configurableTabs && template.configurableTabs!.length > 0) {
      capabilities.push("configurableTab");
    }
    if (template.bots && template.bots!.length > 0) {
      capabilities.push("Bot");
    }
    if (template.composeExtensions) {
      capabilities.push("MessageExtension");
    }
    return ok(capabilities);
  }
  /**
   * Only works for manifest.template.json
   * @param projectRoot
   * @returns
   */
  async getCapabilities(projectRoot: string): Promise<Result<string[], FxError>> {
    const manifestRes = await this.readAppManifest(projectRoot);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    return this._getCapabilities(manifestRes.value);
  }

  async getManifest(
    projectPath: string,
    envInfo: v3.EnvInfoV3,
    ignoreEnvStateValueMissing: boolean,
    telemetryProps?: Record<string, string>
  ): Promise<Result<TeamsAppManifest, FxError>> {
    // Read template
    const manifestTemplateRes = await manifestUtils.readAppManifest(projectPath);
    if (manifestTemplateRes.isErr()) {
      return err(manifestTemplateRes.error);
    }
    const templateJson = manifestTemplateRes.value as TeamsAppManifest;

    //adjust template for samples with unnecessary placeholders
    let hasFrontend = false;
    const capabilities = this._getCapabilities(templateJson);
    if (capabilities.isErr()) {
      return err(capabilities.error);
    }
    hasFrontend =
      capabilities.value.includes("staticTab") || capabilities.value.includes("configurableTab");
    const tabEndpoint = envInfo.state[ComponentNames.TeamsTab]?.endpoint;
    if (!tabEndpoint && !hasFrontend) {
      templateJson.developer = DEFAULT_DEVELOPER;
    }

    const manifestTemplateString = JSON.stringify(templateJson);
    const customizedKeys = getCustomizedKeys("", JSON.parse(manifestTemplateString));
    if (telemetryProps) {
      telemetryProps[TelemetryPropertyKey.customizedKeys] = JSON.stringify(customizedKeys);
    }
    // Render mustache template with state and config
    const resolvedManifestString = resolveManifestTemplate(
      envInfo,
      manifestTemplateString,
      !ignoreEnvStateValueMissing
    );
    const isLocalDebug = envInfo.envName === "local";
    const isProvisionSucceeded =
      envInfo.state.solution.provisionSucceeded === "true" ||
      envInfo.state.solution.provisionSucceeded === true;
    const tokens = [
      ...new Set(
        Mustache.parse(resolvedManifestString)
          .filter((x) => {
            return x[0] != "text" && x[1] != "state.app-manifest.teamsAppId";
          })
          .map((x) => x[1])
      ),
    ];
    if (tokens.length > 0) {
      if (isLocalDebug) {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.GetLocalDebugConfigFailedError.name,
            AppStudioError.GetLocalDebugConfigFailedError.message(
              new Error(getLocalizedString("plugins.appstudio.dataRequired", tokens.join(",")))
            )
          )
        );
      } else {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.GetRemoteConfigFailedError.name,
            AppStudioError.GetRemoteConfigFailedError.message(
              getLocalizedString("plugins.appstudio.dataRequired", tokens.join(",")),
              isProvisionSucceeded
            ),
            HelpLinks.WhyNeedProvision
          )
        );
      }
    }
    const manifest: TeamsAppManifest = JSON.parse(resolvedManifestString);
    // dynamically set validDomains for manifest, which can be refactored by static manifest templates
    if (isLocalDebug || manifest.validDomains?.length === 0) {
      const validDomains: string[] = [];
      const tabEndpoint = envInfo.state[ComponentNames.TeamsTab]?.endpoint as string;
      const tabDomain = envInfo.state[ComponentNames.TeamsTab]?.domain as string;
      if (tabDomain) {
        validDomains.push(tabDomain);
      }
      if (tabEndpoint && isLocalDebug) {
        validDomains.push(tabEndpoint.slice(8));
      }
      const botId = envInfo.state[ComponentNames.TeamsBot]?.botId;
      const botDomain =
        envInfo.state[ComponentNames.TeamsBot]?.validDomain ||
        envInfo.state[ComponentNames.TeamsBot]?.domain;
      if (botId) {
        if (!botDomain) {
          return err(
            AppStudioResultFactory.UserError(
              AppStudioError.GetLocalDebugConfigFailedError.name,
              AppStudioError.GetLocalDebugConfigFailedError.message(
                new Error(getLocalizedString("plugins.appstudio.dataRequired", "domain"))
              )
            )
          );
        } else {
          validDomains.push(botDomain);
        }
      }
      for (const domain of validDomains) {
        if (manifest.validDomains?.indexOf(domain) == -1) {
          manifest.validDomains.push(domain);
        }
      }
    }
    return ok(manifest);
  }

  async isExistingTab(
    inputs: InputsWithProjectPath,
    context: ContextV3
  ): Promise<Result<boolean, FxError>> {
    const manifestTemplateRes = await this.readAppManifest(inputs.projectPath);
    if (manifestTemplateRes.isErr()) return err(manifestTemplateRes.error);
    const manifest = manifestTemplateRes.value;
    const hasTabInProjectSettings = hasTab(context.projectSetting);
    const hasExistingTabInManifest =
      manifest.staticTabs !== undefined &&
      manifest.staticTabs.filter((tab) => tab.contentUrl && !tab.contentUrl.includes("{{state."))
        .length > 0;
    return ok(hasExistingTabInManifest && !hasTabInProjectSettings);
  }
}

export function resolveManifestTemplate(
  envInfo: v3.EnvInfoV3,
  templateString: string,
  keepEnvStatePlaceHoldersIfValuesNotExist = true
): string {
  const view = {
    config: cloneDeep(envInfo.config),
    state: cloneDeep(envInfo.state),
  };
  if (keepEnvStatePlaceHoldersIfValuesNotExist) {
    const spans = Mustache.parse(templateString);
    for (const span of spans) {
      if (span[0] !== "text") {
        const placeholder = span[1];
        const array = placeholder.split(".");
        if (array.length === 3 && array[0] === "state") {
          const component = array[1];
          const configKey = array[2];
          if (!view.state[component] || !view.state[component][configKey]) {
            view.state[component] = view.state[component] || {};
            view.state[component][configKey] = `{{${placeholder}}}`;
          }
        }
      }
    }
  }
  const result = compileHandlebarsTemplateString(templateString, view);
  return result;
}

export async function getManifestTemplatePath(projectRoot: string): Promise<string> {
  const appDir = await getAppDirectory(projectRoot);
  return `${appDir}/${MANIFEST_TEMPLATE_CONSOLIDATE}`;
}

export const manifestUtils = new ManifestUtils();
