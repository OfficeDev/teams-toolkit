// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FxError,
  InputsWithProjectPath,
  Result,
  TeamsAppManifest,
  err,
  ok,
  v3,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import Mustache from "mustache";
import * as path from "path";
import "reflect-metadata";
import stripBom from "strip-bom";
import { v4 } from "uuid";
import isUUID from "validator/lib/isUUID";
import { compileHandlebarsTemplateString } from "../../../../common/tools";
import { FileNotFoundError, MissingEnvironmentVariablesError } from "../../../../error/common";
import {
  BotScenario,
  CommandAndResponseOptionItem,
  ComponentNames,
  DashboardOptionItem,
  NotificationOptionItem,
  WorkflowOptionItem,
} from "../../../constants";
import { convertManifestTemplateToV2, convertManifestTemplateToV3 } from "../../../migrate";
import { expandEnvironmentVariable, getEnvironmentVariables } from "../../../utils/common";
import {
  BOTS_TPL_EXISTING_APP,
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3,
  BOTS_TPL_FOR_NOTIFICATION_V3,
  BOTS_TPL_V3,
  COMPOSE_EXTENSIONS_TPL_EXISTING_APP,
  COMPOSE_EXTENSIONS_TPL_M365_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  CONFIGURABLE_TABS_TPL_EXISTING_APP,
  CONFIGURABLE_TABS_TPL_V3,
  Constants,
  DEFAULT_DEVELOPER,
  STATIC_TABS_MAX_ITEMS,
  STATIC_TABS_TPL_EXISTING_APP,
  STATIC_TABS_TPL_V3,
  WEB_APPLICATION_INFO_V3,
  manifestStateDataRegex,
} from "../constants";
import { AppStudioError } from "../errors";
import { AppStudioResultFactory } from "../results";
import { TelemetryPropertyKey } from "./telemetry";
import { getCustomizedKeys } from "./utils";

export class ManifestUtils {
  async readAppManifest(projectPath: string): Promise<Result<TeamsAppManifest, FxError>> {
    const filePath = await this.getTeamsAppManifestPath(projectPath);
    return await this._readAppManifest(filePath);
  }

  async _readAppManifest(manifestTemplatePath: string): Promise<Result<TeamsAppManifest, FxError>> {
    if (!(await fs.pathExists(manifestTemplatePath))) {
      return err(new FileNotFoundError("teamsApp", manifestTemplatePath));
    }
    // Be compatible with UTF8-BOM encoding
    // Avoid Unexpected token error at JSON.parse()
    let content = await fs.readFile(manifestTemplatePath, { encoding: "utf-8" });
    content = stripBom(content);
    const contentV3 = convertManifestTemplateToV3(content);
    const manifest = JSON.parse(contentV3) as TeamsAppManifest;
    return ok(manifest);
  }

  async _writeAppManifest(
    appManifest: TeamsAppManifest,
    manifestTemplatePath: string
  ): Promise<Result<undefined, FxError>> {
    const content = JSON.stringify(appManifest, undefined, 4);
    const contentV2 = convertManifestTemplateToV2(content);
    await fs.writeFile(manifestTemplatePath, contentV2);
    return ok(undefined);
  }

  async getTeamsAppManifestPath(projectPath: string): Promise<string> {
    const filePath = path.join(projectPath, "appPackage", "manifest.json");
    return filePath;
  }

  async addCapabilities(
    inputs: InputsWithProjectPath,
    capabilities: v3.ManifestCapability[],
    isM365 = false
  ): Promise<Result<undefined, FxError>> {
    const appManifestRes = await this._readAppManifest(inputs["addManifestPath"]);
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
              const tabManifest =
                inputs.features === DashboardOptionItem().id
                  ? STATIC_TABS_TPL_V3[1]
                  : STATIC_TABS_TPL_V3[0];
              const template = cloneDeep(tabManifest);
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
                  feature === CommandAndResponseOptionItem().id ||
                  feature == WorkflowOptionItem().id
                ) {
                  // command and response bot or workflow bot
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3);
                } else if (feature === NotificationOptionItem().id) {
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

    const content = JSON.stringify(appManifest, undefined, 4);
    const contentV2 = convertManifestTemplateToV2(content);
    await fs.writeFile(inputs["addManifestPath"], contentV2);

    return ok(undefined);
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
  _getCapabilities(template: TeamsAppManifest): string[] {
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
    return capabilities;
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
    const capabilities = this._getCapabilities(templateJson);
    const hasFrontend =
      capabilities.includes("staticTab") || capabilities.includes("configurableTab");
    const tabEndpoint = envInfo.state[ComponentNames.TeamsTab]?.endpoint;
    const hasUnresolvedPlaceholders =
      JSON.stringify(templateJson.developer).match(manifestStateDataRegex) !== null;
    if (!tabEndpoint && !hasFrontend && hasUnresolvedPlaceholders) {
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
    const manifestTemplatePath = await this.getTeamsAppManifestPath(projectPath);
    if (tokens.length > 0) {
      return err(
        new MissingEnvironmentVariablesError("teamsApp", tokens.join(","), manifestTemplatePath)
      );
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
        if (!botDomain && !ignoreEnvStateValueMissing) {
          return err(
            new MissingEnvironmentVariablesError("teamsApp", "validDomain", manifestTemplatePath)
          );
        } else if (botDomain) {
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

  async getManifestV3(
    manifestTemplatePath: string,
    generateIdIfNotResolved = true
  ): Promise<Result<TeamsAppManifest, FxError>> {
    const manifestRes = await manifestUtils._readAppManifest(manifestTemplatePath);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    let manifest: TeamsAppManifest = manifestRes.value;

    let teamsAppId = "";
    if (generateIdIfNotResolved) {
      // Corner Case: Avoid MissingEnvironmentVariablesError for manifest.id
      teamsAppId = expandEnvironmentVariable(manifest.id);
      manifest.id = "";
    }

    const manifestTemplateString = JSON.stringify(manifest);

    // Add environment variable keys to telemetry
    const customizedKeys = getEnvironmentVariables(manifestTemplateString);
    const telemetryProps: { [key: string]: string } = {};
    telemetryProps[TelemetryPropertyKey.customizedKeys] = JSON.stringify(customizedKeys);

    const resolvedManifestString = expandEnvironmentVariable(manifestTemplateString);

    const tokens = getEnvironmentVariables(resolvedManifestString);
    if (tokens.length > 0) {
      return err(
        new MissingEnvironmentVariablesError("teamsApp", tokens.join(","), manifestTemplatePath)
      );
    }

    manifest = JSON.parse(resolvedManifestString);

    if (generateIdIfNotResolved) {
      if (!isUUID(teamsAppId)) {
        manifest.id = v4();
      } else {
        manifest.id = teamsAppId;
      }
    }

    return ok(manifest);
  }
  extractManifestFromArchivedFile(archivedFile: Buffer): Result<TeamsAppManifest, FxError> {
    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (!manifestFile) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(Constants.MANIFEST_FILE)
        )
      );
    }
    const manifestString = manifestFile.getData().toString();
    const manifest = JSON.parse(manifestString) as TeamsAppManifest;
    return ok(manifest);
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
          if (view.state[component]?.[configKey] == undefined) {
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

export const manifestUtils = new ManifestUtils();
