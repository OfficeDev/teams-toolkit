// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { Logger } from "./logger";
import { Messages, PluginCICD } from "./constants";
import * as fs from "fs-extra";
import { InternalError } from "./errors";
import { getTemplatesFolder } from "../../..";
import * as path from "path";

export class CICDImpl {
  private ctx?: PluginContext;

  public async preScaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    Logger.info(Messages.PreScaffoldingCICD);
    // Check whether the project root is existing.
    if (!(await fs.pathExists(context.root))) {
      throw new InternalError(`The project's root path: ${context.root} doesn't exist.`);
    }

    return ResultFactory.Success();
  }

  public async scaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;
    Logger.info(Messages.ScaffoldingCICD);
    const cicdTemplatesPath = path.join(getTemplatesFolder(), "plugins", "resource", "cicd");
    // Scaffold GitHub Workflows.
    const githubWorflowsPath = path.join(cicdTemplatesPath, PluginCICD.GITHUB_WORKFLOW_FOLDER);
    const githubCIYmlPath = path.join(githubWorflowsPath, PluginCICD.GITHUB_CI_YML);
    const githubCDYmlPath = path.join(githubWorflowsPath, PluginCICD.GITHUB_CD_YML);
    const projectWorkflowsPath = path.join(context.root, ".github", "workflows");
    await fs.ensureDir(projectWorkflowsPath);

    await fs.copy(githubCIYmlPath, path.join(projectWorkflowsPath, PluginCICD.GITHUB_CI_YML));
    await fs.copy(githubCDYmlPath, path.join(projectWorkflowsPath, PluginCICD.GITHUB_CD_YML));

    // Scaffold AzDo Pipelines.
    const azdoCIYmlPath = path.join(
      cicdTemplatesPath,
      PluginCICD.AZDO_PIPELINE_FOLDER,
      PluginCICD.AZDO_CI_YML
    );
    const azdoCDYmlPath = path.join(
      cicdTemplatesPath,
      PluginCICD.AZDO_PIPELINE_FOLDER,
      PluginCICD.AZDO_CD_YML
    );

    await fs.copy(azdoCIYmlPath, path.join(context.root, PluginCICD.AZDO_CI_YML));
    await fs.copy(azdoCDYmlPath, path.join(context.root, PluginCICD.AZDO_CD_YML));

    Logger.info(Messages.SuccessfullyScaffoldedCICD);

    return ResultFactory.Success();
  }
}
