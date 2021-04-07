// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ApimPluginConfigKeys, TeamsToolkitComponent, ProjectConstants } from "../constants";
import { AssertConfigNotEmpty, AssertNotEmpty } from "../error";
import { IAadPluginConfig, IApimPluginConfig, IFunctionPluginConfig, ISolutionConfig } from "../model/config";
import { ApimService } from "../service/apimService";
import { OpenApiProcessor } from "../util/openApiProcessor";
import { Telemetry } from "../telemetry";
import { NameSanitizer } from "../util/nameSanitizer";
import { IApimAnswer } from "../model/answer";
import { LogProvider } from "fx-api";
import { TeamsAppManifest } from "fx-api";
import * as path from "path";

export class ApimManager {
    private readonly logger?: LogProvider;
    private readonly telemetry: Telemetry;
    private readonly apimService: ApimService;
    private readonly openApiProcessor: OpenApiProcessor;

    constructor(apimService: ApimService, openApiProcessor: OpenApiProcessor, telemetry: Telemetry, logger?: LogProvider) {
        this.logger = logger;
        this.telemetry = telemetry;
        this.apimService = apimService;
        this.openApiProcessor = openApiProcessor;
    }

    public async scaffold(app: Readonly<TeamsAppManifest>, projectRootPath: string): Promise<void> {
        const openApiFileName = path.join(projectRootPath, ProjectConstants.workingDir, ProjectConstants.openApiDocumentFileName);
        await this.openApiProcessor.generateDefaultOpenApi(openApiFileName, app.name.short, app.version);
    }

    public async provision(apimConfig: IApimPluginConfig, solutionConfig: ISolutionConfig, appName: string): Promise<void> {
        const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
        const apimServiceName = apimConfig.serviceName ?? NameSanitizer.sanitizeApimName(appName, solutionConfig.resourceNameSuffix);

        await this.apimService.createService(resourceGroupName, apimServiceName, solutionConfig.location);
        apimConfig.serviceName = apimServiceName;

        const productId = apimConfig.productId ?? NameSanitizer.sanitizeProductId(appName, solutionConfig.resourceNameSuffix);
        await this.apimService.createProduct(resourceGroupName, apimServiceName, productId);
        apimConfig.productId = productId;
    }

    public async postProvision(apimConfig: IApimPluginConfig, solutionConfig: ISolutionConfig, aadConfig: IAadPluginConfig, appName: string): Promise<void> {
        const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
        const apimServiceName = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.serviceName, apimConfig.serviceName);
        const clientId = AssertConfigNotEmpty(
            TeamsToolkitComponent.ApimPlugin,
            ApimPluginConfigKeys.apimClientAADClientId,
            apimConfig.apimClientAADClientId
        );
        const clientSecret = AssertConfigNotEmpty(
            TeamsToolkitComponent.ApimPlugin,
            ApimPluginConfigKeys.apimClientAADClientSecret,
            apimConfig.apimClientAADClientSecret
        );

        const oAuthServerId = apimConfig.oAuthServerId ?? NameSanitizer.sanitizeOAuthServerId(appName, solutionConfig.resourceNameSuffix);
        const scopeName = `${aadConfig.applicationIdUris}/${ApimDefaultValues.enableScopeName}`;
        await this.apimService.createOrUpdateOAuthService(
            resourceGroupName,
            apimServiceName,
            oAuthServerId,
            solutionConfig.tenantId,
            clientId,
            clientSecret,
            scopeName
        );
        apimConfig.oAuthServerId = oAuthServerId;
    }

    public async deploy(
        apimConfig: IApimPluginConfig,
        solutionConfig: ISolutionConfig,
        functionConfig: IFunctionPluginConfig,
        answer: IApimAnswer,
        projectRootPath: string
    ): Promise<void> {
        const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
        const apimServiceName = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.serviceName, apimConfig.serviceName);
        const apiPrefix = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.apiPrefix, apimConfig.apiPrefix);
        const oAuthServerId = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.oAuthServerId, apimConfig.oAuthServerId);
        const productId = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.productId, apimConfig.productId);
        const apiDocumentPath = AssertConfigNotEmpty(
            TeamsToolkitComponent.ApimPlugin,
            ApimPluginConfigKeys.apiDocumentPath,
            apimConfig.apiDocumentPath
        );
        const versionIdentity = AssertNotEmpty("versionAnswer.versionIdentity", answer.versionIdentity);

        const apiId = answer.apiId ?? NameSanitizer.sanitizeApiId(apiPrefix, versionIdentity, solutionConfig.resourceNameSuffix);
        const versionSetId = apimConfig.versionSetId ?? NameSanitizer.sanitizeVersionSetId(apiPrefix, solutionConfig.resourceNameSuffix);
        const apiPath = apimConfig.apiPath ?? NameSanitizer.sanitizeApiPath(apiPrefix, solutionConfig.resourceNameSuffix);

        const openApiDocument = await this.openApiProcessor.loadOpenApiDocument(apiDocumentPath, projectRootPath);
        const spec = this.openApiProcessor.patchOpenApiDocument(
            openApiDocument.spec,
            openApiDocument.schemaVersion,
            functionConfig.functionEndpoint,
            ApimDefaultValues.functionBasePath
        );

        const versionSetDisplayName = NameSanitizer.sanitizeVersionSetDisplayName(openApiDocument.spec.info.title);

        await this.apimService.createVersionSet(resourceGroupName, apimServiceName, versionSetId, versionSetDisplayName);
        apimConfig.versionSetId = versionSetId;

        await this.apimService.importApi(
            resourceGroupName,
            apimServiceName,
            apiId,
            apiPath,
            versionIdentity,
            versionSetId,
            oAuthServerId,
            openApiDocument.schemaVersion,
            spec
        );
        apimConfig.apiPath = apiPath;

        await this.apimService.addApiToProduct(resourceGroupName, apimServiceName, productId, apiId);
    }
}
