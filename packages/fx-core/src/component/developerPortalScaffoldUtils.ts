// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 */

import {
  Context,
  FxError,
  IStaticTab,
  Inputs,
  Result,
  TeamsAppManifest,
  UserError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { getLocalizedString } from "../common/localizeUtils";
import { ObjectIsUndefinedError } from "../core/error";
import { CapabilityOptions } from "../question/create";
import { CoordinatorSource } from "./constants";
import * as appStudio from "./driver/teamsApp/appStudio";
import {
  BOTS_TPL_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  DEFAULT_DESCRIPTION,
  DEFAULT_DEVELOPER,
} from "./driver/teamsApp/constants";
import { AppDefinition } from "./driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { manifestUtils } from "./driver/teamsApp/utils/ManifestUtils";
import { TelemetryUtils } from "./driver/teamsApp/utils/telemetry";
import {
  isBot,
  isBotAndMessageExtension,
  isMessageExtension,
  needTabAndBotCode,
  needTabCode,
} from "./driver/teamsApp/utils/utils";
import { envUtil } from "./utils/envUtil";
import { QuestionNames } from "../question/questionNames";

const appPackageFolderName = "appPackage";
const colorFileName = "color.png";
const outlineFileName = "outline.png";
const manifestFileName = "manifest.json";

export const answerToRepaceBotId = "bot";
export const answerToReplaceMessageExtensionBotId = "messageExtension";

export class DeveloperPortalScaffoldUtils {
  async updateFilesForTdp(
    ctx: Context,
    appDefinition: AppDefinition,
    inputs: Inputs
  ): Promise<Result<undefined, FxError>> {
    if (!ctx.projectPath) {
      return err(new ObjectIsUndefinedError("projectPath"));
    }

    if (!ctx.tokenProvider) {
      return err(new ObjectIsUndefinedError("tokenProvider"));
    }

    const manifestRes = await updateManifest(ctx, appDefinition, inputs);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }

    const envRes = await updateEnv(appDefinition.teamsAppId!, ctx.projectPath!);
    if (envRes.isErr()) {
      return err(envRes.error);
    }

    return ok(undefined);
  }
}

enum TabUrlType {
  WebsiteUrl = "WebsiteUrl",
  ContentUrl = "ContentUrl",
}

async function updateManifest(
  ctx: Context,
  appDefinition: AppDefinition,
  inputs: Inputs
): Promise<Result<undefined, FxError>> {
  TelemetryUtils.init(ctx);
  const res = await appStudio.getAppPackage(
    appDefinition.teamsAppId!,
    ctx.tokenProvider!.m365TokenProvider,
    ctx.logProvider
  );
  if (res.isErr()) {
    return err(res.error);
  }

  const appPackage = res.value;
  if (!appPackage.manifest) {
    const msg = getLocalizedString(
      "core.developerPortal.scaffold.CannotFindManifest",
      appDefinition.teamsAppId
    );
    return err(new UserError(CoordinatorSource, "CouldNotFoundManifest", msg, msg));
  }

  const colorFilePath = path.join(ctx.projectPath!, appPackageFolderName, colorFileName);
  const outlineFilePath = path.join(ctx.projectPath!, appPackageFolderName, outlineFileName);

  const manifestTemplatePath = path.join(ctx.projectPath!, appPackageFolderName, manifestFileName);
  const manifestRes = await manifestUtils._readAppManifest(manifestTemplatePath);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const existingManifestTemplate = manifestRes.value;

  if (!existingManifestTemplate) {
    return err(new ObjectIsUndefinedError("manifest.json downloaded from template"));
  }

  // icons
  const icons = appPackage.icons;
  if (icons) {
    if (icons.color) {
      await fs.writeFile(colorFilePath, icons.color);
    }

    if (icons.outline) {
      await fs.writeFile(outlineFilePath, icons.outline);
    }
  }

  // manifest
  const manifest = JSON.parse(appPackage.manifest.toString("utf8")) as TeamsAppManifest;
  manifest.id = "${{TEAMS_APP_ID}}";

  // manifest: tab
  const tabs = manifest.staticTabs;
  let needUpdateStaticTabUrls = false;
  if (
    inputs[QuestionNames.ReplaceContentUrl] &&
    inputs[QuestionNames.ReplaceContentUrl].length != 0
  ) {
    needUpdateStaticTabUrls = true;
    updateTabUrl(
      inputs[QuestionNames.ReplaceContentUrl],
      TabUrlType.ContentUrl,
      tabs,
      existingManifestTemplate.staticTabs
    );
  }

  if (
    inputs[QuestionNames.ReplaceWebsiteUrl] &&
    inputs[QuestionNames.ReplaceWebsiteUrl].length != 0
  ) {
    needUpdateStaticTabUrls = true;
    updateTabUrl(
      inputs[QuestionNames.ReplaceWebsiteUrl],
      TabUrlType.WebsiteUrl,
      tabs,
      existingManifestTemplate.staticTabs
    );
  }

  if (needUpdateStaticTabUrls) {
    const validDomains = manifest.validDomains ?? [];
    validDomains.push("${{TAB_DOMAIN}}");
    manifest.validDomains = validDomains;
  }

  // manifest: bot
  if (inputs[QuestionNames.ReplaceBotIds]) {
    if (inputs[QuestionNames.ReplaceBotIds].includes(answerToRepaceBotId)) {
      if (existingManifestTemplate.bots && existingManifestTemplate.bots.length > 0) {
        manifest.bots = existingManifestTemplate.bots;
      } else {
        manifest.bots = BOTS_TPL_V3;
        manifest.bots[0].botId = "${{BOT_ID}}";
      }
    }

    if (inputs[QuestionNames.ReplaceBotIds].includes(answerToReplaceMessageExtensionBotId)) {
      if (
        existingManifestTemplate.composeExtensions &&
        existingManifestTemplate.composeExtensions.length > 0
      ) {
        manifest.composeExtensions = existingManifestTemplate.composeExtensions;
      } else {
        manifest.composeExtensions = COMPOSE_EXTENSIONS_TPL_V3;
        manifest.composeExtensions[0].botId = "${{BOT_ID}}";
      }
    }
  }

  // manifest: no tab, bot or me selected on TDP before
  if (!getTemplateId(appDefinition)) {
    // which means user selects a capability through TTK UI.
    manifest.bots = existingManifestTemplate.bots;
    manifest.composeExtensions = existingManifestTemplate.composeExtensions;
    manifest.staticTabs = existingManifestTemplate.staticTabs;
    manifest.configurableTabs = existingManifestTemplate.configurableTabs;
    manifest.permissions = existingManifestTemplate.permissions;
    manifest.validDomains = existingManifestTemplate.validDomains;
    manifest.webApplicationInfo = existingManifestTemplate.webApplicationInfo;
  }

  // manifest: developer
  if (manifest.developer) {
    if (!manifest.developer.websiteUrl) {
      manifest.developer.websiteUrl = DEFAULT_DEVELOPER.websiteUrl;
    }

    if (!manifest.developer.privacyUrl) {
      manifest.developer.privacyUrl = DEFAULT_DEVELOPER.privacyUrl;
    }

    if (!manifest.developer.termsOfUseUrl) {
      manifest.developer.termsOfUseUrl = DEFAULT_DEVELOPER.termsOfUseUrl;
    }

    if (!manifest.developer.name) {
      manifest.developer.name = DEFAULT_DEVELOPER.name;
    }

    if (!manifest.description.short) {
      manifest.description.short = DEFAULT_DESCRIPTION.short;
    }

    if (!manifest.description.full) {
      manifest.description.full = DEFAULT_DESCRIPTION.full;
    }
  }

  await fs.writeFile(manifestTemplatePath, JSON.stringify(manifest, null, "\t"), "utf-8");

  // languages
  const languages = appPackage.languages;
  if (languages) {
    for (const code in languages) {
      const content = JSON.parse(languages[code].toString("utf8"));
      const languageFilePath = path.join(ctx.projectPath!, appPackageFolderName, `${code}.json`);
      await fs.writeFile(languageFilePath, JSON.stringify(content, null, "\t"), "utf-8");
    }
  }
  return ok(undefined);
}

async function updateEnv(appId: string, projectPath: string): Promise<Result<undefined, FxError>> {
  return await envUtil.writeEnv(projectPath, "local", {
    TEAMS_APP_ID: appId,
  });
}

function updateTabUrl(
  answers: string[],
  tabUrlType: TabUrlType,
  tabs: IStaticTab[] | undefined,
  existingManifestStaticTabs: IStaticTab[] | undefined
) {
  if (!tabs || tabs.length === 0) {
    return err(new ObjectIsUndefinedError("static tabs"));
  }

  if (!existingManifestStaticTabs || existingManifestStaticTabs.length === 0) {
    return err(new ObjectIsUndefinedError("static tabs in manifest.json"));
  }
  answers.forEach((answer: string) => {
    const tabToUpdate = findTabBasedOnName(answer, tabs);
    if (tabToUpdate) {
      switch (tabUrlType) {
        case TabUrlType.ContentUrl:
          tabToUpdate.contentUrl = existingManifestStaticTabs[0].contentUrl;
          break;
        case TabUrlType.WebsiteUrl:
          tabToUpdate.websiteUrl = existingManifestStaticTabs[0].websiteUrl;
          break;
        default:
          break;
      }
    }
  });
}

function findTabBasedOnName(name: string, tabs: IStaticTab[]): IStaticTab | undefined {
  return tabs.find((o) => o.name === name);
}

export function getTemplateId(
  teamsApp: AppDefinition
): { projectType: string; templateId: string } | undefined {
  // tab with bot, tab with message extension, tab with bot and message extension
  if (needTabAndBotCode(teamsApp)) {
    return { projectType: "tab-bot-type", templateId: CapabilityOptions.nonSsoTabAndBot().id };
  }

  // tab only
  if (needTabCode(teamsApp)) {
    return { projectType: "tab-type", templateId: CapabilityOptions.nonSsoTab().id };
  }

  // bot and message extension
  if (isBotAndMessageExtension(teamsApp)) {
    return { projectType: "bot-me-type", templateId: CapabilityOptions.botAndMe().id };
  }

  // message extension
  if (isMessageExtension(teamsApp)) {
    return { projectType: "me-type", templateId: CapabilityOptions.me().id };
  }

  // bot
  if (isBot(teamsApp)) {
    return { projectType: "bot-type", templateId: CapabilityOptions.basicBot().id };
  }

  return undefined;
}

export function isFromDevPortal(inputs: Inputs | undefined): boolean {
  return !!inputs?.teamsAppFromTdp;
}

export const developerPortalScaffoldUtils = new DeveloperPortalScaffoldUtils();
