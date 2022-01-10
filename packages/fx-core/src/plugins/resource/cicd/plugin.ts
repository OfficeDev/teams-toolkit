// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { Logger } from "./logger";
import { FileNames, Messages, PluginCICD } from "./constants";
import * as fs from "fs-extra";
import { InternalError } from "./errors";
import { getTemplatesFolder } from "../../..";
import * as path from "path";

export class CICDImpl {
  private ctx?: PluginContext;

  public async preScaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    Logger.info(Messages.PreScaffoldingCICD);
    // Check whether the project root's package.json is existing.
    const packageJsonFile = path.join(context.root, FileNames.PACKAGE_JSON);
    if (!(await fs.pathExists(packageJsonFile))) {
      throw new InternalError(`The project's package.json: ${packageJsonFile} doesn't exist.`);
    }

    return ResultFactory.Success();
  }

  public async scaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    Logger.info(Messages.ScaffoldingCICD);

    const packageJsonFile = path.join(context.root, FileNames.PACKAGE_JSON);
    try {
      const packageJson = await fs.readJson(packageJsonFile);
      packageJson.devDependencies = {
        "@microsoft/teamsfx-cli": PluginCICD.TEAMSFX_CLI_VERSION,
      };
      await fs.writeJSON(packageJsonFile, packageJson, { spaces: 4 });
    } catch (error) {
      throw new InternalError(Messages.FailToReadWritePackageJson, error);
    }

    Logger.info(Messages.SuccessfullyScaffoldedCICD);

    return ResultFactory.Success();
  }
}
