// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ProjectConstants } from "../constants";
import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../../../folder";
import { OpenApiProcessor } from "../utils/openApiProcessor";

export class ScaffoldManager {
  private readonly logger: LogProvider | undefined;
  private readonly telemetryReporter: TelemetryReporter | undefined;
  private readonly openApiProcessor: OpenApiProcessor;

  constructor(
    openApiProcessor: OpenApiProcessor,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ) {
    this.openApiProcessor = openApiProcessor;
    this.logger = logger;
    this.telemetryReporter = telemetryReporter;
  }

  public async scaffold(appName: string, projectRootPath: string): Promise<void> {
    const outputDir = path.join(projectRootPath, ProjectConstants.workingDir);

    const openApiFileName = path.join(outputDir, ProjectConstants.openApiDocumentFileName);
    await this.openApiProcessor.generateDefaultOpenApi(
      openApiFileName,
      appName,
      ApimDefaultValues.apiVersion
    );

    const inputReadmeFileName = path.join(
      path.join(getTemplatesFolder(), "plugins", "resource", "apim"),
      ProjectConstants.readMeFileName
    );
    const outputReadmeFileName = path.join(outputDir, ProjectConstants.readMeFileName);
    await fs.copy(inputReadmeFileName, outputReadmeFileName);
  }
}
