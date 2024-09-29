// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { hooks } from "@feathersjs/hooks";
import {
  Context,
  FxError,
  IComposeExtension,
  IMessagingExtensionCommand,
  InputsWithProjectPath,
  ManifestCapability,
  Result,
  TeamsAppManifest,
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
import { getCapabilities as checkManifestCapabilities } from "../../../../common/projectTypeChecker";
import { ErrorContextMW } from "../../../../common/globalVars";
import { FileNotFoundError, JSONSyntaxError, ReadFileError } from "../../../../error/common";
import { CapabilityOptions } from "../../../../question/constants";
import { BotScenario } from "../../../constants";
import { convertManifestTemplateToV2, convertManifestTemplateToV3 } from "../../../migrate";
import { expandEnvironmentVariable } from "../../../utils/common";
import { WrapDriverContext } from "../../util/wrapUtil";
import {
  getBotsTplExistingAppBasedOnVersion,
  getBotsTplForCommandAndResponseBasedOnVersion,
  getBotsTplForNotificationBasedOnVersion,
  getBotsTplBasedOnVersion,
  COMPOSE_EXTENSIONS_TPL_EXISTING_APP,
  COMPOSE_EXTENSIONS_TPL_M365_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  getConfigurableTabsTplExistingAppBasedOnVersion,
  getConfigurableTabsTplBasedOnVersion,
  Constants,
  STATIC_TABS_MAX_ITEMS,
  STATIC_TABS_TPL_EXISTING_APP,
  STATIC_TABS_TPL_V3,
  WEB_APPLICATION_INFO_V3,
} from "../constants";
import { AppStudioError } from "../errors";
import { AppStudioResultFactory } from "../results";
import { getResolvedManifest } from "./utils";
import { ManifestType } from "../../../utils/envFunctionUtils";
import { DriverContext } from "../../interface/commonArgs";

export class ManifestUtils {
  async readAppManifest(projectPath: string): Promise<Result<TeamsAppManifest, FxError>> {
    const filePath = this.getTeamsAppManifestPath(projectPath);
    return await this._readAppManifest(filePath);
  }

  readAppManifestSync(projectPath: string): Result<TeamsAppManifest, FxError> {
    const filePath = this.getTeamsAppManifestPath(projectPath);
    if (!fs.existsSync(filePath)) {
      return err(new FileNotFoundError("teamsApp", filePath));
    }
    // Be compatible with UTF8-BOM encoding
    // Avoid Unexpected token error at JSON.parse()
    let content;
    try {
      content = fs.readFileSync(filePath, { encoding: "utf-8" });
    } catch (e) {
      return err(new ReadFileError(e, "ManifestUtils"));
    }
    content = stripBom(content);
    const contentV3 = convertManifestTemplateToV3(content);
    try {
      const manifest = JSON.parse(contentV3) as TeamsAppManifest;
      return ok(manifest);
    } catch (e) {
      return err(new JSONSyntaxError(filePath, e, "ManifestUtils"));
    }
  }

  @hooks([ErrorContextMW({ component: "ManifestUtils" })])
  async _readAppManifest(manifestTemplatePath: string): Promise<Result<TeamsAppManifest, FxError>> {
    if (!(await fs.pathExists(manifestTemplatePath))) {
      return err(new FileNotFoundError("teamsApp", manifestTemplatePath));
    }
    // Be compatible with UTF8-BOM encoding
    // Avoid Unexpected token error at JSON.parse()
    let content = await fs.readFile(manifestTemplatePath, { encoding: "utf-8" });
    content = stripBom(content);
    const contentV3 = convertManifestTemplateToV3(content);
    try {
      const manifest = JSON.parse(contentV3) as TeamsAppManifest;
      return ok(manifest);
    } catch (e) {
      return err(new JSONSyntaxError(manifestTemplatePath, e, "ManifestUtils"));
    }
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
    const manifestVersion = appManifest.manifestVersion;
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
                getConfigurableTabsTplExistingAppBasedOnVersion(manifestVersion)
              );
            } else {
              appManifest.configurableTabs = appManifest.configurableTabs.concat(
                getConfigurableTabsTplBasedOnVersion(manifestVersion)
              );
            }
          }
          break;
        case "Bot":
          appManifest.bots = appManifest.bots || [];
          if (capability.snippet) {
            appManifest.bots.push(capability.snippet);
          } else {
            if (capability.existingApp) {
              appManifest.bots = appManifest.bots.concat(
                getBotsTplExistingAppBasedOnVersion(manifestVersion)
              );
            } else {
              // import QuestionNames introduces dependency cycle and breaks the whole program
              // inputs[QuestionNames.Features]
              if (inputs.features) {
                const feature = inputs.features;
                if (
                  feature === CapabilityOptions.commandBot().id ||
                  feature == CapabilityOptions.workflowBot().id
                ) {
                  // command and response bot or workflow bot
                  appManifest.bots = appManifest.bots.concat(
                    getBotsTplForCommandAndResponseBasedOnVersion(manifestVersion)
                  );
                } else if (feature === CapabilityOptions.notificationBot().id) {
                  // notification
                  appManifest.bots = appManifest.bots.concat(
                    getBotsTplForNotificationBasedOnVersion(manifestVersion)
                  );
                } else {
                  // legacy bot
                  appManifest.bots = appManifest.bots.concat(
                    getBotsTplBasedOnVersion(manifestVersion)
                  );
                }
              } else if (inputs.scenarios) {
                const scenariosRaw = inputs.scenarios;
                const scenarios = Array.isArray(scenariosRaw) ? scenariosRaw : [];
                if (
                  scenarios.includes(BotScenario.CommandAndResponseBot) ||
                  scenarios.includes(BotScenario.WorkflowBot)
                ) {
                  // command and response bot or workflow bot
                  appManifest.bots = appManifest.bots.concat(
                    getBotsTplForCommandAndResponseBasedOnVersion(manifestVersion)
                  );
                } else if (scenarios.includes(BotScenario.NotificationBot)) {
                  // notification
                  appManifest.bots = appManifest.bots.concat(
                    getBotsTplForNotificationBasedOnVersion(manifestVersion)
                  );
                } else {
                  // legacy bot
                  appManifest.bots = appManifest.bots.concat(
                    getBotsTplBasedOnVersion(manifestVersion)
                  );
                }
              } else {
                appManifest.bots = appManifest.bots.concat(
                  getBotsTplBasedOnVersion(manifestVersion)
                );
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
    return checkManifestCapabilities(template);
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

  public async getPluginFilePath(
    manifest: TeamsAppManifest,
    manifestPath: string
  ): Promise<Result<string, FxError>> {
    const pluginFile = manifest.copilotExtensions
      ? manifest.copilotExtensions.plugins?.[0]?.file
      : manifest.copilotAgents?.plugins?.[0]?.file;
    if (pluginFile) {
      const plugin = path.resolve(path.dirname(manifestPath), pluginFile);
      const doesFileExist = await fs.pathExists(plugin);
      if (doesFileExist) {
        return ok(plugin);
      } else {
        return err(new FileNotFoundError("ManifestUtils", pluginFile));
      }
    } else {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.TeamsAppRequiredPropertyMissingError.name,
          AppStudioError.TeamsAppRequiredPropertyMissingError.message("plugins", manifestPath)
        )
      );
    }
  }

  async getManifestV3(
    manifestTemplatePath: string,
    context: DriverContext,
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
    const resolvedManifestRes = await getResolvedManifest(
      manifestTemplateString,
      manifestTemplatePath,
      ManifestType.TeamsManifest,
      context
    );

    if (resolvedManifestRes.isErr()) {
      return err(resolvedManifestRes.error);
    }
    const resolvedManifestString = resolvedManifestRes.value;
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
