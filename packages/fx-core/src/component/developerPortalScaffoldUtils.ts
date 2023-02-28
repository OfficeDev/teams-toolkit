// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 */

import { AppDefinition } from "./resource/appManifest/interfaces/appDefinition";
import * as appStudio from "./resource/appManifest/appStudio";
import * as os from "os";
import {
  err,
  Result,
  ok,
  FxError,
  UserError,
  ContextV3,
  Inputs,
  TeamsAppManifest,
  IStaticTab,
  Platform,
} from "@microsoft/teamsfx-api";
import path from "path";
import fs from "fs-extra";
import { environmentManager } from "../core/environment";
import { CoreQuestionNames } from "../core/question";
import {
  BOTS_TPL_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  DEFAULT_DEVELOPER,
} from "./resource/appManifest/constants";
import { ObjectIsUndefinedError } from "../core/error";
import {
  BotOptionItem,
  CoordinatorSource,
  DefaultBotAndMessageExtensionItem,
  MessageExtensionNewUIItem,
  TabNonSsoAndDefaultBotItem,
  TabNonSsoItem,
} from "./constants";
import { getLocalizedString } from "../common/localizeUtils";
import { manifestUtils } from "./resource/appManifest/utils/ManifestUtils";
import {
  isBot,
  isBotAndMessageExtension,
  isMessageExtension,
  needTabAndBotCode,
  needTabCode,
} from "./resource/appManifest/utils/utils";

const appPackageFolderName = "appPackage";
const colorFileName = "color.png";
const outlineFileName = "outline.png";
const manifestFileName = "manifest.json";

export const answerToRepaceBotId = "bot";
export const answerToReplaceMessageExtensionBotId = "messageExtension";

export class DeveloperPortalScaffoldUtils {
  async updateFilesForTdp(
    ctx: ContextV3,
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

export enum TabUrlType {
  WebsiteUrl = "WebsiteUrl",
  ContentUrl = "ContentUrl",
}

async function updateManifest(
  ctx: ContextV3,
  appDefinition: AppDefinition,
  inputs: Inputs
): Promise<Result<undefined, FxError>> {
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

  // Adding a feature with groupchat scope in TDP won't pass manifest validation in TTK.
  // This is a short-term solution to convert the value to what TTK expects.
  if (!!manifest.configurableTabs && manifest.configurableTabs.length > 0) {
    if (manifest.configurableTabs[0].scopes) {
      {
        manifest.configurableTabs[0].scopes = updateScope(
          manifest.configurableTabs[0].scopes
        ) as any;
      }
    }
  }
  if (!!manifest.bots && manifest.bots.length > 0) {
    if (manifest.bots[0].scopes) {
      {
        manifest.bots[0].scopes = updateScope(manifest.bots[0].scopes) as any;
      }
    }
  }

  // manifest: tab
  const tabs = manifest.staticTabs;
  let needUpdateStaticTabUrls = false;
  if (
    inputs[CoreQuestionNames.ReplaceContentUrl] &&
    inputs[CoreQuestionNames.ReplaceContentUrl].length != 0
  ) {
    needUpdateStaticTabUrls = true;
    updateTabUrl(
      inputs[CoreQuestionNames.ReplaceContentUrl],
      TabUrlType.ContentUrl,
      tabs,
      existingManifestTemplate.staticTabs
    );
  }

  if (
    inputs[CoreQuestionNames.ReplaceWebsiteUrl] &&
    inputs[CoreQuestionNames.ReplaceWebsiteUrl].length != 0
  ) {
    needUpdateStaticTabUrls = true;
    updateTabUrl(
      inputs[CoreQuestionNames.ReplaceWebsiteUrl],
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
  if (inputs[CoreQuestionNames.ReplaceBotIds]) {
    if (inputs[CoreQuestionNames.ReplaceBotIds].includes(answerToRepaceBotId)) {
      if (existingManifestTemplate.bots && existingManifestTemplate.bots.length > 0) {
        manifest.bots = existingManifestTemplate.bots;
      } else {
        manifest.bots = BOTS_TPL_V3;
        manifest.bots[0].botId = "${{BOT_ID}}";
      }
    }

    if (inputs[CoreQuestionNames.ReplaceBotIds].includes(answerToReplaceMessageExtensionBotId)) {
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
  const dotEnvFile = environmentManager.getDotEnvPath("local", projectPath);
  const source = await fs.readFile(dotEnvFile);
  const writeStream = fs.createWriteStream(dotEnvFile);
  source
    .toString()
    .split(/\r?\n/)
    .forEach((line) => {
      const reg = /^([a-zA-Z_][a-zA-Z0-9_]*=)/g;
      const match = reg.exec(line);
      if (match) {
        if (match[1].startsWith("TEAMS_APP_ID=")) {
          writeStream.write(`TEAMS_APP_ID=${appId}${os.EOL}`);
        } else {
          writeStream.write(`${line.trim()}${os.EOL}`);
        }
      } else {
        writeStream.write(`${line.trim()}${os.EOL}`);
      }
    });

  writeStream.end();
  return ok(undefined);
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

export function getTemplateId(teamsApp: AppDefinition): string | undefined {
  // tab with bot, tab with message extension, tab with bot and message extension
  if (needTabAndBotCode(teamsApp)) {
    return TabNonSsoAndDefaultBotItem().id;
  }

  // tab only
  if (needTabCode(teamsApp)) {
    return TabNonSsoItem().id;
  }

  // bot and message extension
  if (isBotAndMessageExtension(teamsApp)) {
    return DefaultBotAndMessageExtensionItem().id;
  }

  // message extension
  if (isMessageExtension(teamsApp)) {
    return MessageExtensionNewUIItem().id;
  }

  // bot
  if (isBot(teamsApp)) {
    return BotOptionItem().id;
  }

  return undefined;
}

export function updateScope(scopes: string[]): string[] {
  return scopes.map((o) => o.toLowerCase());
}

export function isFromDevPortal(inputs: Inputs): boolean {
  return !!inputs.teamsAppFromTdp;
}

export const developerPortalScaffoldUtils = new DeveloperPortalScaffoldUtils();
