// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { Logger } from "./logger";
import path from "path";
import * as fs from "fs-extra";

export class CICDImpl {
  public async addCICDWorkflows(context: Context, projectPath: string): Promise<FxResult> {
    Logger.info("Calling addCICDWorkflows.");
    const githubWorkflowsPath = path.join(projectPath, ".github", "workflows");
    const cdYMLPath = path.join(githubWorkflowsPath, "cd.yml");
    await fs.ensureDir(githubWorkflowsPath);
    await fs.writeFile(cdYMLPath, "test");
    return ResultFactory.Success();
  }
}
