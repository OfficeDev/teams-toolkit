// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fs from "fs-extra";
import { Constants, LanguageType, FileType } from "./constants";
import { getTemplatesFolder } from "../../../folder";
import { ApiConnectorResult, ResultFactory } from "./result";
import { compileHandlebarsTemplateString } from "../../../common";
import { ConstantString } from "../../../common/constants";
import { ApiConnectorConfiguration } from "./utils";
import { ErrorMessage } from "./errors";
export class SampleHandler {
  private readonly projectRoot: string;
  private readonly laguageType: FileType;
  private readonly component: string;
  constructor(projectPath: string, languageType: string, component: string) {
    this.projectRoot = projectPath;
    this.laguageType = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
    this.component = component;
  }

  private getFileType(): FileType {
    return this.laguageType;
  }

  public async generateSampleCode(config: ApiConnectorConfiguration): Promise<ApiConnectorResult> {
    const fileSuffix: string = this.getFileType();
    const templateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "apiconnector",
      "sample",
      fileSuffix
    );
    const templateName: string = Constants.pluginNameShort + ".template";
    const templateFilePath = path.join(templateDirectory, templateName);
    try {
      const templateString = await fs.readFile(templateFilePath, ConstantString.UTF8Encoding);
      const context = {
        config: config,
        capitalName: config.APIName.toUpperCase(),
      };
      const codeFile = compileHandlebarsTemplateString(templateString, context);
      const codeFileName: string = config.APIName + "." + fileSuffix;
      await fs.writeFile(path.join(this.projectRoot, this.component, codeFileName), codeFile);
      return ResultFactory.Success();
    } catch (error) {
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorSampleCodeCreateFailError.name,
        ErrorMessage.ApiConnectorSampleCodeCreateFailError.message(templateFilePath, error.message)
      );
    }
  }
}
