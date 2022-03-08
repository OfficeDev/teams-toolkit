// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, ok } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { FileSystemError, InternalError, NoProjectOpenedError } from "../errors";
import { TemplateKind } from "./enums";
import path from "path";
import Mustache from "mustache";
import { getTemplatesFolder } from "../../../..";

export class CICDProvider {
  public scaffoldTo = "";
  public providerName = "";
  public sourceTemplateName?: (templateName: string) => string;
  public targetTemplateName?: (templateName: string, envName: string) => string;
  public async scaffold(
    projectPath: string,
    templateName: string,
    replacements: any
  ): Promise<Result<boolean, FxError>> {
    // 0. Preconditions check.
    if (!(await fs.pathExists(projectPath))) {
      throw new NoProjectOpenedError();
    }
    if (!Object.values<string>(TemplateKind).includes(templateName)) {
      throw new InternalError(`${templateName} as template kind was not recognized.`);
    }
    if (!this.sourceTemplateName || !this.targetTemplateName) {
      throw new InternalError("sourceTemplateName or targetTemplateName shoudn't be undefined.");
    }

    // 1. Ensure the target path is existing.
    const targetPath = path.join(projectPath, this.scaffoldTo);
    try {
      await fs.ensureDir(targetPath);
    } catch (e) {
      throw new FileSystemError(`Fail to create path: ${targetPath}`, e as Error);
    }

    // 2. Read README from local.
    const targetReadMePath = path.join(targetPath, "README.md");
    if (!(await fs.pathExists(targetReadMePath))) {
      const localReadMePath = path.join(
        getTemplatesFolder(),
        "plugins",
        "resource",
        "cicd",
        this.providerName,
        "README.md"
      );
      const readmeContent = await this.readLocalFile(localReadMePath);
      try {
        await fs.writeFile(targetReadMePath, readmeContent);
      } catch (e) {
        throw new FileSystemError(`Fail to write file: ${targetReadMePath}`, e as Error);
      }
    }

    // 3. Read template from local.
    const targetTemplatePath = path.join(
      targetPath,
      this.targetTemplateName(templateName, replacements.env_name)
    );
    if (!(await fs.pathExists(targetTemplatePath))) {
      const localTemplatePath = path.join(
        getTemplatesFolder(),
        "plugins",
        "resource",
        "cicd",
        this.providerName,
        this.sourceTemplateName(templateName)
      );
      const templateContent = await this.readLocalFile(localTemplatePath);
      const renderedContent = Mustache.render(templateContent, replacements);
      try {
        await fs.writeFile(targetTemplatePath, renderedContent);
      } catch (e) {
        throw new FileSystemError(`Fail to write file: ${targetTemplatePath}`, e as Error);
      }
    }

    return ok(true);
  }

  public async readLocalFile(localPath: string): Promise<string> {
    if (!(await fs.pathExists(localPath))) {
      throw new InternalError(`local path: ${localPath} not found.`);
    }

    try {
      return (await fs.readFile(localPath)).toString();
    } catch (e) {
      throw new FileSystemError(`Fail to read file: ${localPath}`, e as Error);
    }
  }
}
