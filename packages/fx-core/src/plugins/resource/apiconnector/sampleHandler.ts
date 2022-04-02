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
import { ApiConnectorConfiguration } from "./config";
import { ErrorMessage } from "./errors";
export class SampleHandler {
  private readonly projectRoot: string;
  private readonly languageExt: FileType;
  private readonly component: string;
  constructor(projectPath: string, languageType: string, component: string) {
    this.projectRoot = projectPath;
    this.languageExt = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
    this.component = component;
  }

  public async generateSampleCode(config: ApiConnectorConfiguration): Promise<ApiConnectorResult> {
    const fileSuffix: string = this.languageExt;
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
      const codeFileName: string = config.APIName + "." + fileSuffix;
      const codeFilePath = path.join(this.projectRoot, this.component, codeFileName);
      if (await fs.pathExists(codeFilePath)) {
        await fs.remove(codeFilePath);
      }
      const codeFile = compileHandlebarsTemplateString(templateString, context);
      await fs.writeFile(codeFilePath, codeFile);
      return ResultFactory.Success();
    } catch (error) {
      throw ResultFactory.SystemError(
        ErrorMessage.SampleCodeCreateFailError.name,
        ErrorMessage.SampleCodeCreateFailError.message(templateFilePath, error.message)
      );
    }
  }
}
