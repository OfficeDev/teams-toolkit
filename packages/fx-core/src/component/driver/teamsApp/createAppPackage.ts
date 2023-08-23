// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Colors, FxError, Platform, Result, err, ok } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import * as path from "path";
import { Service } from "typedi";
import { isCopilotPluginEnabled } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ErrorContextMW } from "../../../core/globalVars";
import { FileNotFoundError, InvalidActionInputError } from "../../../error/common";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { WrapDriverContext } from "../util/wrapUtil";
import { Constants } from "./constants";
import { CreateAppPackageArgs } from "./interfaces/CreateAppPackageArgs";
import { manifestUtils } from "./utils/ManifestUtils";

export const actionName = "teamsApp/zipAppPackage";

@Service(actionName)
export class CreateAppPackageDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.createAppPackageDriver");
  readonly progressTitle = getLocalizedString(
    "plugins.appstudio.createPackage.progressBar.message"
  );

  public async execute(
    args: CreateAppPackageArgs,
    context: DriverContext
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.build(args, wrapContext);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([
    ErrorContextMW({ source: "Teams", component: "CreateAppPackageDriver" }),
    addStartAndEndTelemetry(actionName, actionName),
  ])
  public async build(
    args: CreateAppPackageArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }

    let manifestPath = args.manifestPath;
    if (!path.isAbsolute(manifestPath)) {
      manifestPath = path.join(context.projectPath, manifestPath);
    }

    const manifestRes = await manifestUtils.getManifestV3(manifestPath);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    const manifest = manifestRes.value;
    // Deal with relative path
    // Environment variables should have been replaced by value
    // ./build/appPackage/appPackage.dev.zip instead of ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
    let zipFileName = args.outputZipPath;
    if (!path.isAbsolute(zipFileName)) {
      zipFileName = path.join(context.projectPath, zipFileName);
    }
    const zipFileDir = path.dirname(zipFileName);
    await fs.mkdir(zipFileDir, { recursive: true });

    let jsonFileName = args.outputJsonPath;
    if (!path.isAbsolute(jsonFileName)) {
      jsonFileName = path.join(context.projectPath, jsonFileName);
    }
    const jsonFileDir = path.dirname(jsonFileName);
    await fs.mkdir(jsonFileDir, { recursive: true });

    const appDirectory = path.dirname(manifestPath);

    const colorFile = path.join(appDirectory, manifest.icons.color);
    if (!(await fs.pathExists(colorFile))) {
      const error = new FileNotFoundError(
        actionName,
        colorFile,
        "https://aka.ms/teamsfx-actions/teamsapp-zipAppPackage"
      );
      return err(error);
    }

    const outlineFile = path.join(appDirectory, manifest.icons.outline);
    if (!(await fs.pathExists(outlineFile))) {
      const error = new FileNotFoundError(
        actionName,
        outlineFile,
        "https://aka.ms/teamsfx-actions/teamsapp-zipAppPackage"
      );
      return err(error);
    }

    // pre-check existence
    if (
      manifest.localizationInfo &&
      manifest.localizationInfo.additionalLanguages &&
      manifest.localizationInfo.additionalLanguages.length > 0
    ) {
      for (const language of manifest.localizationInfo.additionalLanguages) {
        const file = language.file;
        const fileName = `${appDirectory}/${file}`;
        if (!(await fs.pathExists(fileName))) {
          return err(
            new FileNotFoundError(
              actionName,
              fileName,
              "https://aka.ms/teamsfx-actions/teamsapp-zipAppPackage"
            )
          );
        }
      }
    }

    const zip = new AdmZip();
    zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest, null, 4)));

    // outline.png & color.png, relative path
    let dir = path.dirname(manifest.icons.color);
    zip.addLocalFile(colorFile, dir === "." ? "" : dir);
    dir = path.dirname(manifest.icons.outline);
    zip.addLocalFile(outlineFile, dir === "." ? "" : dir);

    // localization file
    if (
      manifest.localizationInfo &&
      manifest.localizationInfo.additionalLanguages &&
      manifest.localizationInfo.additionalLanguages.length > 0
    ) {
      for (const language of manifest.localizationInfo.additionalLanguages) {
        const file = language.file;
        const fileName = `${appDirectory}/${file}`;
        const dir = path.dirname(file);
        zip.addLocalFile(fileName, dir === "." ? "" : dir);
      }
    }

    // M365 Copilot plugin, API specification and Adaptive card templates
    if (
      isCopilotPluginEnabled() &&
      manifest.composeExtensions &&
      manifest.composeExtensions.length > 0 &&
      manifest.composeExtensions[0].type == "apiBased" &&
      manifest.composeExtensions[0].apiSpecFile
    ) {
      const apiSpecFile = `${appDirectory}/${manifest.composeExtensions[0].apiSpecFile}`;
      if (!(await fs.pathExists(apiSpecFile))) {
        return err(
          new FileNotFoundError(
            actionName,
            apiSpecFile,
            "https://aka.ms/teamsfx-actions/teamsapp-zipAppPackage"
          )
        );
      }
      const dir = path.dirname(manifest.composeExtensions[0].apiSpecFile);
      zip.addLocalFile(apiSpecFile, dir === "." ? "" : dir);

      if (manifest.composeExtensions[0].commands.length > 0) {
        for (const command of manifest.composeExtensions[0].commands) {
          if (command.apiResponseRenderingTemplate) {
            const adaptiveCardFile = `${appDirectory}/${command.apiResponseRenderingTemplate}`;
            if (!(await fs.pathExists(adaptiveCardFile))) {
              return err(
                new FileNotFoundError(
                  actionName,
                  adaptiveCardFile,
                  "https://aka.ms/teamsfx-actions/teamsapp-zipAppPackage"
                )
              );
            }
            const dir = path.dirname(command.apiResponseRenderingTemplate);
            zip.addLocalFile(adaptiveCardFile, dir === "." ? "" : dir);
          }
        }
      }
    }

    zip.writeZip(zipFileName);

    if (await fs.pathExists(jsonFileName)) {
      await fs.chmod(jsonFileName, 0o777);
    }
    await fs.writeFile(jsonFileName, JSON.stringify(manifest, null, 4));
    await fs.chmod(jsonFileName, 0o444);

    const builtSuccess = [
      { content: "(√)Done: ", color: Colors.BRIGHT_GREEN },
      { content: "Teams Package ", color: Colors.BRIGHT_WHITE },
      { content: zipFileName, color: Colors.BRIGHT_MAGENTA },
      { content: " built successfully!", color: Colors.BRIGHT_WHITE },
    ];
    if (context.platform === Platform.VS || context.platform === Platform.VSCode) {
      context.logProvider.info(builtSuccess);
    } else {
      void context.ui!.showMessage("info", builtSuccess, false);
    }

    return ok(new Map());
  }

  private validateArgs(args: CreateAppPackageArgs): Result<any, FxError> {
    const invalidParams: string[] = [];
    if (!args || !args.manifestPath) {
      invalidParams.push("manifestPath");
    }
    if (!args || !args.outputJsonPath) {
      invalidParams.push("outputJsonPath");
    }
    if (!args || !args.outputZipPath) {
      invalidParams.push("outputZipPath");
    }
    if (invalidParams.length > 0) {
      return err(
        new InvalidActionInputError(
          actionName,
          invalidParams,
          "https://aka.ms/teamsfx-actions/teamsapp-zipAppPackage"
        )
      );
    } else {
      return ok(undefined);
    }
  }
}
