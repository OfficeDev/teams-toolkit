// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CICDProvider } from "./provider";
import { Result, FxError, ok, IProgressHandler } from "@microsoft/teamsfx-api";
import path from "path";
import * as fs from "fs-extra";
import { InternalError } from "../errors";
import { URLPrefixes } from "../constants";
import Mustache, { render } from "mustache";
import { getTemplatesFolder } from "../../../..";

export class GitHubProvider extends CICDProvider {
  private static instance: GitHubProvider;
  static getInstance() {
    if (!GitHubProvider.instance) {
      GitHubProvider.instance = new GitHubProvider();
      GitHubProvider.instance.targetPath = ".github/workflows";
    }
    return GitHubProvider.instance;
  }

  public async scaffold(
    projectPath: string,
    templateName: string,
    replacements: any
  ): Promise<Result<boolean, FxError>> {
    await super.scaffold(projectPath, templateName, replacements);

    // 1. Ensure the target path is existing.
    const targetPath = path.join(projectPath, this.targetPath);
    try {
      await fs.ensureDir(targetPath);
    } catch (e) {
      throw new InternalError(`Fail to create path: ${targetPath}`, e as Error);
    }

    // 2. Read README from remote or local.
    const targetReadMePath = path.join(targetPath, "README.md");
    if (!(await fs.pathExists(targetReadMePath))) {
      const targetReadMeUrl = `${URLPrefixes.CICD_TEMPLATES}/github/README.md`;
      const localReadMePath = path.join(
        getTemplatesFolder(),
        "plugins",
        "resource",
        "cicd",
        "github",
        "README.md"
      );
      const readmeContent = await super.fetchRemoteOrFallbackLocal(
        targetReadMeUrl,
        localReadMePath
      );
      try {
        await fs.writeFile(targetReadMePath, readmeContent);
      } catch (e) {
        throw new InternalError(`Fail to write file: ${targetReadMePath}`, e as Error);
      }
    }

    // 3. Read template from remote or local.
    const targetTemplatePath = path.join(
      targetPath,
      `${templateName}.${replacements.env_name}.yml`
    );
    if (!(await fs.pathExists(targetTemplatePath))) {
      const targetTemplateUrl = `${URLPrefixes.CICD_TEMPLATES}/github/${templateName}.yml`;
      const localTemplatePath = path.join(
        getTemplatesFolder(),
        "plugins",
        "resource",
        "cicd",
        "github",
        `${templateName}.yml`
      );
      const templateContent = await super.fetchRemoteOrFallbackLocal(
        targetTemplateUrl,
        localTemplatePath
      );
      const renderedContent = Mustache.render(templateContent, replacements);
      try {
        await fs.writeFile(targetTemplatePath, renderedContent);
      } catch (e) {
        throw new InternalError(`Fail to write file: ${targetTemplatePath}`, e as Error);
      }
    }
    return ok(true);
  }
}
