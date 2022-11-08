// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
} from "@microsoft/teamsfx-api";
import path from "path";
import { manifestUtils } from "./resource/appManifest/utils/ManifestUtils";
import fs from "fs-extra";
import { environmentManager } from "../core/environment";
import { CoreQuestionNames } from "../core/question";
import { DEFAULT_DEVELOPER } from "./resource/appManifest/constants";
import { ObjectIsUndefinedError } from "../core/error";
import { CoordinatorSource } from "./constants";
import { getLocalizedString } from "../common/localizeUtils";

const appPackageFolderName = "appPackage";
const resourcesFolderName = "resources";
const colorFileName = "color.png";
const outlineFileName = "outline.png";
const manifestFileName = "manifest.template.json";

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

  const colorFilePath = path.join(
    ctx.projectPath!,
    appPackageFolderName,
    resourcesFolderName,
    colorFileName
  );
  const outlineFilePath = path.join(
    ctx.projectPath!,
    appPackageFolderName,
    resourcesFolderName,
    outlineFileName
  );

  const manifestTemplatePath = path.join(ctx.projectPath!, appPackageFolderName, manifestFileName);

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
  manifest.icons.color = "resources/color.png";
  manifest.icons.outline = "resources/outline.png";

  // manifest: tab
  const tabs = manifest.staticTabs;
  let needUpdateStaticTabUrls = false;
  if (
    inputs[CoreQuestionNames.ReplaceContentUrl] &&
    inputs[CoreQuestionNames.ReplaceContentUrl].length != 0
  ) {
    needUpdateStaticTabUrls = true;
    updateTabUrl(inputs[CoreQuestionNames.ReplaceContentUrl], TabUrlType.ContentUrl, tabs);
  }

  if (
    inputs[CoreQuestionNames.ReplaceWebsiteUrl] &&
    inputs[CoreQuestionNames.ReplaceWebsiteUrl].length != 0
  ) {
    needUpdateStaticTabUrls = true;
    updateTabUrl(inputs[CoreQuestionNames.ReplaceWebsiteUrl], TabUrlType.WebsiteUrl, tabs);
  }

  if (needUpdateStaticTabUrls) {
    const validDomains = manifest.validDomains ?? [];
    validDomains.push("${{TAB_DOMAIN}}");
    manifest.validDomains = validDomains;
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
          writeStream.write(`${match[1]}${os.EOL}`);
        }
      } else {
        writeStream.write(`${line.trim()}${os.EOL}`);
      }
    });

  writeStream.end();
  return ok(undefined);
}

function updateTabUrl(answers: string[], tabUrlType: TabUrlType, tabs: IStaticTab[] | undefined) {
  if (!tabs || tabs.length === 0) {
    return err(new UserError("", "", "", ""));
  }
  answers.forEach((answer: string) => {
    const tabToUpdate = findTabBasedOnName(answer, tabs);
    if (tabToUpdate) {
      switch (tabUrlType) {
        case TabUrlType.ContentUrl:
          tabToUpdate.contentUrl = "${{TAB_ENDPOINT}}/index.html#/tab";
          break;
        case TabUrlType.WebsiteUrl:
          tabToUpdate.websiteUrl = "${{TAB_ENDPOINT}}/index.html#/tab";
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

export const developerPortalScaffoldUtils = new DeveloperPortalScaffoldUtils();
