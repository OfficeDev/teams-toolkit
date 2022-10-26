// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Result, FxError, TeamsAppManifest } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { Service } from "typedi";
import { Constants } from "../../resource/appManifest/constants";
import { AppStudioError } from "../../resource/appManifest/errors";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { asFactory, asString, wrapRun } from "../../utils/common";
import { DriverContext } from "../interface/commonArgs";
import { StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { CopyAppPackageForSPFxArgs } from "./interfaces/CopyAppPackageForSPFxArgs";

const actionName = "teamsApp/copyAppPackageForSPFx";

@Service(actionName)
export class CopyAppPackageForSPFxDriver implements StepDriver {
  private readonly EmptyMap = new Map<string, string>();

  private asCopyAppPackageArgs = asFactory<CopyAppPackageForSPFxArgs>({
    appPackagePath: asString,
    spfxFolder: asString,
  });

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CopyAppPackageForSPFxArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(() => this.copy(args, context));
  }

  public async copy(
    args: CopyAppPackageForSPFxArgs,
    context: DriverContext
  ): Promise<Map<string, string>> {
    const copyAppPackageArgs = this.asCopyAppPackageArgs(args);
    if (!(await fs.pathExists(copyAppPackageArgs.appPackagePath))) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(copyAppPackageArgs.appPackagePath)
      );
    }
    const pictures = await this.getIcons(copyAppPackageArgs.appPackagePath);
    const spfxTeamsPath = `${copyAppPackageArgs.spfxFolder}/teams`;
    await fs.copyFile(
      copyAppPackageArgs.appPackagePath,
      path.join(spfxTeamsPath, "TeamsSPFxApp.zip")
    );

    for (const file of await fs.readdir(`${copyAppPackageArgs.spfxFolder}/teams`)) {
      if (file.endsWith("color.png") && pictures.color) {
        await fs.writeFile(path.join(spfxTeamsPath, file), pictures.color);
      } else if (file.endsWith("outline.png") && pictures.outline) {
        await fs.writeFile(path.join(spfxTeamsPath, file), pictures.outline);
      }
    }
    return this.EmptyMap;
  }

  public async getIcons(appPackagePath: string): Promise<IIcons> {
    const archivedFile = await fs.readFile(appPackagePath);
    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (!manifestFile) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(Constants.MANIFEST_FILE)
      );
    }
    const manifestString = manifestFile.getData().toString();
    const manifest = JSON.parse(manifestString) as TeamsAppManifest;

    const colorFile =
      manifest.icons.color && !manifest.icons.color.startsWith("https://")
        ? zipEntries.find((x) => x.entryName.includes("color.png"))
        : undefined;
    const outlineFile =
      manifest.icons.outline && !manifest.icons.outline.startsWith("https://")
        ? zipEntries.find((x) => x.entryName.includes("outline.png"))
        : undefined;
    return { color: colorFile?.getData(), outline: outlineFile?.getData() };
  }
}

interface IIcons {
  color?: Buffer;
  outline?: Buffer;
}
