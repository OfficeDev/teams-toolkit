// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fse from "fs-extra";
import { Constants, LanguageType, FileType } from "./constants";
import { getTemplatesFolder } from "../../../folder";
import { ApiConnectorResult, ResultFactory } from "./result";
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

  public async generateSampleCode(): Promise<ApiConnectorResult> {
    const fileSuffix: string = this.getFileType();
    const sampleCodeDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "apiconnector",
      "sample",
      fileSuffix
    );
    const fileName: string = Constants.pluginNameShort + "." + fileSuffix;
    await fse.copyFile(
      path.join(sampleCodeDirectory, fileName),
      path.join(this.projectRoot, this.component, fileName)
    );
    return ResultFactory.Success();
  }
}
