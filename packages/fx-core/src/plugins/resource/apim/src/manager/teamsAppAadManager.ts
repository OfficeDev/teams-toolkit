// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from 'teamsfx-api';
import { ApimPluginConfigKeys, TeamsToolkitComponent, ComponentRetryLifeCycle } from '../constants';
import { AssertConfigNotEmpty } from '../error';
import { IApimPluginConfig, IAadPluginConfig } from '../model/config';
import { AadService } from '../service/aadService';
import { Telemetry } from '../telemetry';

export class TeamsAppAadManager {
    private readonly logger?: LogProvider;
    private readonly telemetry: Telemetry;
    private readonly aadService: AadService;

    constructor(aadService: AadService, telemetry: Telemetry, logger?: LogProvider) {
        this.logger = logger;
        this.telemetry = telemetry;
        this.aadService = aadService;
    }

    public async postProvision(aadConfig: IAadPluginConfig, apimConfig: IApimPluginConfig) {
        const apimClientAADClientId = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.apimClientAADClientId, apimConfig.apimClientAADClientId);
        const data = { api: { knownClientApplications: [apimClientAADClientId] } };

        await this.aadService.createServicePrincipalIfNotExists(aadConfig.clientId);
        await this.aadService.updateAad(aadConfig.objectId, data);
    }
}
