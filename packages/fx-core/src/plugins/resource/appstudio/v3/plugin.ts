// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  v2,
  v3,
  Result,
  FxError,
  TeamsAppManifest,
  err,
  ok,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import AdmZip from "adm-zip";
import { IAppDefinition } from "../interfaces/IAppDefinition";
import { AppStudioClient } from "../appStudio";
import { AppStudioResultFactory } from "../results";
import { AppStudioError } from "../errors";
import { getAppDirectory } from "../../../../common";
import { Constants } from "../constants";
import { convertToAppDefinition } from "../utils/utils";

export class AppStudioPluginImpl {
  public async createTeamsApp(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<string, FxError>> {
    let archivedFile;
    // User provided zip file
    if (inputs.appPackagePath) {
      if (await fs.pathExists(inputs.appPackagePath)) {
        archivedFile = await fs.readFile(inputs.appPackagePath);
      } else {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.FileNotFoundError.name,
            AppStudioError.FileNotFoundError.message(inputs.appPackagePath)
          )
        );
      }
    } else {
      const appDefinitionRes = await this.getAppDefinitionAndManifest(inputs.projectPath, envInfo);
      if (appDefinitionRes.isErr()) {
        return err(appDefinitionRes.error);
      }
      const manifest: TeamsAppManifest = appDefinitionRes.value[1];
      manifest.bots = undefined;
      manifest.composeExtensions = undefined;

      return ok("");

      const appDirectory = await getAppDirectory(inputs.projectPath);
      const colorFile = `${appDirectory}/${manifest.icons.color}`;
      if (!(await fs.pathExists(colorFile))) {
        throw AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(colorFile)
        );
      }

      const outlineFile = `${appDirectory}/${manifest.icons.outline}`;
      if (!(await fs.pathExists(outlineFile))) {
        throw AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(outlineFile)
        );
      }

      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest)));
      zip.addLocalFile(colorFile);
      zip.addLocalFile(outlineFile);

      archivedFile = zip.toBuffer();
    }

    const appStudioToken = await tokenProvider.appStudioToken.getAccessToken();
    try {
      const appDefinition = await AppStudioClient.createApp(
        archivedFile,
        appStudioToken!,
        ctx.logProvider
      );
      ctx.logProvider?.info(`Teams app created: ${appDefinition.appId}`);
      return ok(appDefinition.appId!);
    } catch (e: any) {
      // Teams app already exists, will update it
      if (e.name === "409") {
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
        const appDefinition = convertToAppDefinition(manifest);

        const colorIconContent = zipEntries
          .find((x) => x.entryName === manifest.icons.color)
          ?.getData()
          .toString();
        const outlineIconContent = zipEntries
          .find((x) => x.entryName === manifest.icons.outline)
          ?.getData()
          .toString();

        try {
          const app = await AppStudioClient.updateApp(
            manifest.id,
            appDefinition,
            appStudioToken!,
            undefined,
            colorIconContent,
            outlineIconContent
          );

          ctx.logProvider?.info(`Teams app updated: ${appDefinition.appId}`);
          return ok(app.teamsAppId!);
        } catch (e: any) {
          return err(
            AppStudioResultFactory.SystemError(
              AppStudioError.TeamsAppUpdateFailedError.name,
              AppStudioError.TeamsAppUpdateFailedError.message(e)
            )
          );
        }
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.TeamsAppCreateFailedError.name,
            AppStudioError.TeamsAppCreateFailedError.message(e)
          )
        );
      }
    }
  }

  public async updateTeamsApp() {}

  public async publishTeamsApp() {}

  private async getAppDefinitionAndManifest(
    projectPath: string,
    envInfo: v3.EnvInfoV3
  ): Promise<Result<[IAppDefinition, TeamsAppManifest], FxError>> {
    // Read template

    // Render mustache template with state and config
    return ok([{ appName: "appName" }, new TeamsAppManifest()]);
  }
}
