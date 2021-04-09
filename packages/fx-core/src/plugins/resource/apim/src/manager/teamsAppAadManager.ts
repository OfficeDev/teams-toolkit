// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { GraphTokenProvider, LogProvider } from "fx-api";
import { ApimPluginConfigKeys, TeamsToolkitComponent } from "../constants";
import { AssertConfigNotEmpty } from "../error";
import { Factory } from "../factory";
import { IApimPluginConfig, IAadPluginConfig } from "../model/config";
import { AadService } from "../service/aadService";
import { Telemetry } from "../telemetry";
import { Lazy } from "../util/lazy";

export class TeamsAppAadManager {
    private readonly logger?: LogProvider;
    private readonly telemetry: Telemetry;
    private readonly lazyAadService: Lazy<AadService>;

    constructor(lazyAadService: Lazy<AadService>, telemetry: Telemetry, logger?: LogProvider) {
        this.logger = logger;
        this.telemetry = telemetry;
        this.lazyAadService = lazyAadService;
    }

    public async postProvision(aadConfig: IAadPluginConfig, apimConfig: IApimPluginConfig): Promise<void> {
        const aadService = await this.lazyAadService.value();
        const apimClientAADClientId = AssertConfigNotEmpty(
            TeamsToolkitComponent.ApimPlugin,
            ApimPluginConfigKeys.apimClientAADClientId,
            apimConfig.apimClientAADClientId
        );
        const data = { api: { knownClientApplications: [apimClientAADClientId] } };

        await aadService.createServicePrincipalIfNotExists(aadConfig.clientId);
        await aadService.updateAad(aadConfig.objectId, data);
    }
}
