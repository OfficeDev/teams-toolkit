// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FxError,
  InputsWithProjectPath,
  ManifestCapability,
  Result,
  TeamsAppManifest,
  IComposeExtension,
  IMessagingExtensionCommand,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as path from "path";
import "reflect-metadata";
import stripBom from "strip-bom";
import { v4 } from "uuid";
import isUUID from "validator/lib/isUUID";
import { FileNotFoundError, MissingEnvironmentVariablesError } from "../../../../error/common";
import { CapabilityOptions } from "../../../../question/create";
import { BotScenario } from "../../../constants";
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
  STATIC_TABS_MAX_ITEMS,
  STATIC_TABS_TPL_EXISTING_APP,
  STATIC_TABS_TPL_V3,
  WEB_APPLICATION_INFO_V3,
} from "../constants";
import { AppStudioError } from "../errors";
import { AppStudioResultFactory } from "../results";
import { TelemetryPropertyKey } from "./telemetry";
import { WrapDriverContext } from "../../util/wrapUtil";

export class ManifestUtils {
  async readAppManifest(projectPath: string): Promise<Result<TeamsAppManifest, FxError>> {
    const filePath = this.getTeamsAppManifestPath(projectPath);
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

  getTeamsAppManifestPath(projectPath: string): string {
    const filePath = path.join(projectPath, "appPackage", "manifest.json");
    return filePath;
  }

  async addCapabilities(
    inputs: InputsWithProjectPath,
    capabilities: ManifestCapability[],
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
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              template.entityId = "index" + staticTabIndex;
              appManifest.staticTabs.push(template);
            } else {
              const tabManifest =
                inputs.features === CapabilityOptions.dashboardTab().id
                  ? STATIC_TABS_TPL_V3[1]
                  : STATIC_TABS_TPL_V3[0];
              const template = cloneDeep(tabManifest);
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
                  feature === CapabilityOptions.commandBot().id ||
                  feature == CapabilityOptions.workflowBot().id
                ) {
                  // command and response bot or workflow bot
                  appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3);
                } else if (feature === CapabilityOptions.notificationBot().id) {
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
          manifest.staticTabs !== undefined && manifest.staticTabs.length >= STATIC_TABS_MAX_ITEMS
        );
      case "configurableTab":
        return manifest.configurableTabs !== undefined && manifest.configurableTabs.length >= 1;
      case "Bot":
        return manifest.bots !== undefined && manifest.bots.length >= 1;
      case "MessageExtension":
        return manifest.composeExtensions !== undefined && manifest.composeExtensions.length >= 1;
      case "WebApplicationInfo":
        return false;
      default:
        return false;
    }
  }
  public getCapabilities(template: TeamsAppManifest): string[] {
    const capabilities: string[] = [];
    if (template.staticTabs && template.staticTabs.length > 0) {
      capabilities.push("staticTab");
    }
    if (template.configurableTabs && template.configurableTabs.length > 0) {
      capabilities.push("configurableTab");
    }
    if (template.bots && template.bots.length > 0) {
      capabilities.push("Bot");
    }
    if (template.composeExtensions) {
      capabilities.push("MessageExtension");
    }
    return capabilities;
  }

  /**
   * Get command id from composeExtensions
   * @param manifest
   */
  public getOperationIds(manifest: TeamsAppManifest): string[] {
    const ids: string[] = [];
    manifest.composeExtensions?.map((extension: IComposeExtension) => {
      extension.commands?.map((command: IMessagingExtensionCommand) => {
        ids.push(command.id);
      });
    });
    return ids;
  }

  async getManifestV3(
    manifestTemplatePath: string,
    context?: WrapDriverContext,
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
    telemetryProps[TelemetryPropertyKey.customizedKeys] = customizedKeys.join(";");
    if (context) {
      context.addTelemetryProperties(telemetryProps);
    }

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

export const manifestUtils = new ManifestUtils();
