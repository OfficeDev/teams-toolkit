// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ProjectConstants } from "../constants";
import { OpenApiProcessor } from "../util/openApiProcessor";
import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";

export class ScaffoldManager {
    private readonly logger?: LogProvider;
    private readonly telemetryReporter?: TelemetryReporter;
    private readonly openApiProcessor: OpenApiProcessor;

    constructor(openApiProcessor: OpenApiProcessor, telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        this.openApiProcessor = openApiProcessor;
        this.logger = logger;
        this.telemetryReporter = telemetryReporter;
    }

    public async scaffold(appName: string, projectRootPath: string): Promise<void> {
        const outputDir =  path.join(projectRootPath, ProjectConstants.workingDir);
        
        const openApiFileName = path.join(outputDir, ProjectConstants.openApiDocumentFileName);
        await this.openApiProcessor.generateDefaultOpenApi(openApiFileName, appName, ApimDefaultValues.apiVersion);
        
        const inputReadmeFileName = path.join(ProjectConstants.resourceDir, ProjectConstants.readMeFileName);
        const outputReadmeFileName = path.join(outputDir, ProjectConstants.readMeFileName);
        await fs.copy(inputReadmeFileName, outputReadmeFileName);
    }
}