// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fs from "fs-extra";
import { Constants, LanguageType, FileType } from "./constants";
import { getTemplatesFolder } from "../../../folder";
import { FileChange, FileChangeType, ResultFactory } from "./result";
import { compileHandlebarsTemplateString } from "../../../common";
import { ConstantString } from "../../../common/constants";
import { ApiConnectorConfiguration } from "./config";
import { ErrorMessage } from "./errors";
import { getSampleDirPath } from "./utils";
export class SampleHandler {
  private readonly projectRoot: string;
  private readonly languageExt: FileType;
  private readonly component: string;
  constructor(projectPath: string, languageType: string, component: string) {
    this.projectRoot = projectPath;
    this.languageExt = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
    this.component = component;
  }

  public async generateSampleCode(config: ApiConnectorConfiguration): Promise<FileChange> {
    const fileSuffix: string = this.languageExt;
    const baseDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "apiconnector",
      "sample"
    );
    const templateDirectory = path.join(baseDirectory, fileSuffix);
    const headerCommentTemplateFilePath = path.join(baseDirectory, Constants.headerCommentTemplate);
    const footerCommentTemplateFilePath = path.join(baseDirectory, Constants.footerCommentTemplate);
    const templateName: string = config.AuthConfig.AuthType + Constants.templateEx;
    const templateFilePath = path.join(templateDirectory, templateName);
    try {
      const footerCommentString = await fs.readFile(
        footerCommentTemplateFilePath,
        ConstantString.UTF8Encoding
      );
      const headerCommentString = await fs.readFile(
        headerCommentTemplateFilePath,
        ConstantString.UTF8Encoding
      );
      let templateString = await fs.readFile(templateFilePath, ConstantString.UTF8Encoding);
      templateString = `${headerCommentString}\n${templateString}\n${footerCommentString}`;
      const context = {
        config: config,
        capitalName: config.APIName.toUpperCase(),
        component: this.component,
        languageExt: this.languageExt,
      };
      const sampleFileName: string = config.APIName + "." + fileSuffix;
      const componentPath = path.join(this.projectRoot, this.component);
      const sampleDirPath = getSampleDirPath(componentPath);
      fs.ensureDir(sampleDirPath);
      const sampleFilePath = path.join(sampleDirPath, sampleFileName);
      if (await fs.pathExists(sampleFilePath)) {
        await fs.remove(sampleFilePath);
      }
      const sampleFile = compileHandlebarsTemplateString(templateString, context);
      await fs.writeFile(sampleFilePath, sampleFile);
      return {
        changeType: FileChangeType.Create,
        filePath: sampleFilePath,
      };
    } catch (error) {
      throw ResultFactory.SystemError(
        ErrorMessage.SampleCodeCreateFailError.name,
        ErrorMessage.SampleCodeCreateFailError.message(templateFilePath, error.message)
      );
    }
  }
}
