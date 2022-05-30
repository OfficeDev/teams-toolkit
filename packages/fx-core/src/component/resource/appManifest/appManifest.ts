// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Action,
  CloudResource,
  ContextV3,
  err,
  FileEffect,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProvisionContextV3,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { isBotNotificationEnabled } from "../../../common/featureFlags";
import { getTemplatesFolder } from "../../../folder";
import {
  BOTS_TPL_EXISTING_APP,
  COLOR_TEMPLATE,
  COMPOSE_EXTENSIONS_TPL_EXISTING_APP,
  CONFIGURABLE_TABS_TPL_EXISTING_APP,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_DEVELOPER_PRIVACY_URL,
  DEFAULT_DEVELOPER_TERM_OF_USE_URL,
  DEFAULT_DEVELOPER_WEBSITE_URL,
  DEFAULT_OUTLINE_PNG_FILENAME,
  OUTLINE_TEMPLATE,
  STATIC_TABS_TPL_EXISTING_APP,
} from "../../../plugins/resource/appstudio/constants";
import {
  AzureSolutionQuestionNames,
  BotScenario,
} from "../../../plugins/solution/fx-solution/question";
import { createOrUpdateTeamsApp, publishTeamsApp } from "./appStudio";
import {
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3,
  BOTS_TPL_FOR_NOTIFICATION_V3,
  BOTS_TPL_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  CONFIGURABLE_TABS_TPL_V3,
  STATIC_TABS_TPL_V3,
  TEAMS_APP_MANIFEST_TEMPLATE,
  WEB_APPLICATION_INFO_V3,
} from "./constants";
import { readAppManifest, writeAppManifest } from "./utils";

@Service("app-manifest")
export class AppManifest implements CloudResource {
  name = "app-manifest";
  outputs = {
    teamsAppId: {
      key: "teamsAppId",
    },
    tenantId: {
      key: "tenantId",
    },
  };
  finalOutputKeys = ["teamsAppId", "tenantId"];
  init(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const createFilePath = [
      path.join(inputs.projectPath, "templates", "appPackage", "resources", "color.png"),
      path.join(inputs.projectPath, "templates", "appPackage", "resources", "outline.png"),
      path.join(inputs.projectPath, "templates", "appPackage", "manifest.template.json"),
    ];
    const effect: FileEffect = {
      type: "file",
      operate: "create",
      filePath: createFilePath,
    };
    const action: Action = {
      name: "app-manifest.init",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([effect]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const existingApp = inputs.existingApp as boolean;
        const manifestString = TEAMS_APP_MANIFEST_TEMPLATE;
        const manifest = JSON.parse(manifestString);
        if (existingApp) {
          manifest.developer = {
            name: "Teams App, Inc.",
            websiteUrl: DEFAULT_DEVELOPER_WEBSITE_URL,
            privacyUrl: DEFAULT_DEVELOPER_PRIVACY_URL,
            termsOfUseUrl: DEFAULT_DEVELOPER_TERM_OF_USE_URL,
          };
        }
        const templateFolder = path.join(inputs.projectPath, "templates");
        await fs.ensureDir(templateFolder);
        const appPackageFolder = path.join(templateFolder, "appPackage");
        await fs.ensureDir(appPackageFolder);
        const resourcesFolder = path.resolve(appPackageFolder, "resources");
        await fs.ensureDir(resourcesFolder);
        const targetManifestPath = path.join(appPackageFolder, "manifest.template.json");
        await fs.writeFile(targetManifestPath, JSON.stringify(manifest, null, 4));
        const templatesFolder = getTemplatesFolder();
        const defaultColorPath = path.join(templatesFolder, COLOR_TEMPLATE);
        const defaultOutlinePath = path.join(templatesFolder, OUTLINE_TEMPLATE);
        await fs.copy(defaultColorPath, path.join(resourcesFolder, DEFAULT_COLOR_PNG_FILENAME));
        await fs.copy(defaultOutlinePath, path.join(resourcesFolder, DEFAULT_OUTLINE_PNG_FILENAME));
        return ok([effect]);
      },
    };
    return ok(action);
  }
  addCapability(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const effect: FileEffect = {
      type: "file",
      operate: "replace",
      filePath: path.join(inputs.projectPath, "templates", "appPackage", "manifest.template.json"),
    };
    const action: Action = {
      name: "app-manifest.addCapability",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        effect.remarks = `add capabilities (${JSON.stringify(inputs.capabilities)}) in manifest`;
        return ok([effect]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const appManifestRes = await readAppManifest(inputs.projectPath);
        if (appManifestRes.isErr()) return err(appManifestRes.error);
        const appManifest = appManifestRes.value;
        const capability = inputs.capability as v3.ManifestCapability;
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
                if (appManifest.bots === undefined) {
                  appManifest.bots = [];
                }

                if (isBotNotificationEnabled()) {
                  const scenariosRaw = inputs[AzureSolutionQuestionNames.Scenarios];
                  const scenarios = Array.isArray(scenariosRaw) ? scenariosRaw : [];

                  if (scenarios.includes(BotScenario.CommandAndResponseBot)) {
                    // command and response bot
                    appManifest.bots = appManifest.bots.concat(
                      BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3
                    );
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
                appManifest.composeExtensions =
                  appManifest.composeExtensions.concat(COMPOSE_EXTENSIONS_TPL_V3);
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
        effect.remarks = `capability: ${capability.name}`;
        await writeAppManifest(appManifest, inputs.projectPath);
        return ok([effect]);
      },
    };
    return ok(action);
  }
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "app-manifest.provision",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "teams.microsoft.com",
            remarks: "register or update teams app",
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const res = await createOrUpdateTeamsApp(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
        if (res.isErr()) return err(res.error);
        return ok([
          {
            type: "service",
            name: "teams.microsoft.com",
            remarks: "register or update teams app",
          },
        ]);
      },
    };
    return ok(action);
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return this.provision(context, inputs);
  }
  publish(
    context: ProvisionContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "app-manifest.publish",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([
          {
            type: "service",
            name: "teams.microsoft.com",
            remarks: "publish teams app",
          },
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const res = await publishTeamsApp(
          ctx,
          inputs,
          ctx.envInfo,
          ctx.tokenProvider.appStudioToken
        );
        if (res.isErr()) return err(res.error);
        return ok([
          {
            type: "service",
            name: "teams.microsoft.com",
            remarks: "publish teams app",
          },
        ]);
      },
    };
    return ok(action);
  }
}
