// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fse from "fs-extra";
import { Constants, LanguageType, FileType } from "./constants";
import { getTemplatesFolder } from "../../../folder";
import { ApiConnectorResult, ResultFactory } from "./result";
import { ApiConnectorConfiguration } from "./utils";
export class SampleHandler {
  private readonly projectRoot: string;
  private readonly laguageType: FileType;
  private readonly component: string;
  constructor(projectPath: string, languageType: string, component: string) {
    this.projectRoot = projectPath;
    this.laguageType = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
    this.component = component;
  }

  public async generateSampleCode(config: ApiConnectorConfiguration): Promise<ApiConnectorResult> {
    const fileSuffix: string = this.laguageType;
    const sampleCodeDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "apiconnector",
      "sample",
      fileSuffix
    );
    const sampleFileName: string = Constants.pluginNameShort + "." + fileSuffix;
    const targetFileName: string = config.APIName + "." + fileSuffix;
    await fse.copyFile(
      path.join(sampleCodeDirectory, sampleFileName),
      path.join(this.projectRoot, this.component, targetFileName)
    );
    return ResultFactory.Success();
  }
}
