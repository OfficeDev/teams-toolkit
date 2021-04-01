// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from 'teamsfx-api';
import { ApimPluginConfigKeys, TeamsToolkitComponent } from '../constants';
import { AssertConfigNotEmpty, AssertNotEmpty, BuildError, InvalidAadObjectId } from '../error';
import { IAadInfo, IRequiredResourceAccess } from '../model/aadResponse';
import { IAadPluginConfig, IApimPluginConfig } from '../model/config';
import { AadService } from '../service/aadService';
import { Telemetry } from '../telemetry';
import { NameSanitizer } from '../util/nameSanitizer';

export class AadManager {
    private readonly logger?: LogProvider;
    private readonly telemetry: Telemetry;
    private readonly aadService: AadService;

    constructor(aadService: AadService, telemetry: Telemetry, logger?: LogProvider) {
        this.logger = logger;
        this.telemetry = telemetry;
        this.aadService = aadService;
    }

    public async provision(
        apimPluginConfig: IApimPluginConfig,
        appName: string,
    ): Promise<void> {
        if (!apimPluginConfig.apimClientAADObjectId) {
            const aadInfo = await this.aadService.createAad(
                NameSanitizer.sanitizeAadDisplayName(appName),
            );
            apimPluginConfig.apimClientAADObjectId = AssertNotEmpty('id', aadInfo.id);
            apimPluginConfig.apimClientAADClientId = AssertNotEmpty('appId', aadInfo.appId);
            const secretResult = await this.aadService.addSecret(
                apimPluginConfig.apimClientAADObjectId,
                NameSanitizer.sanitizeAadSecretDisplayName(appName),
            );
            apimPluginConfig.apimClientAADClientSecret = AssertNotEmpty('secretText', secretResult.secretText);
        } else {
            const existingAadInfo = await this.aadService.getAad(apimPluginConfig.apimClientAADObjectId);
            if (!existingAadInfo) {
                throw BuildError(InvalidAadObjectId, apimPluginConfig.apimClientAADObjectId);
            }
            apimPluginConfig.apimClientAADClientId = AssertNotEmpty('appId', existingAadInfo.appId);

            if (!apimPluginConfig.apimClientAADClientSecret) {
                const secretResult = await this.aadService.addSecret(
                    apimPluginConfig.apimClientAADObjectId,
                    NameSanitizer.sanitizeAadSecretDisplayName(appName),
                );
                apimPluginConfig.apimClientAADClientSecret = AssertNotEmpty('secretText', secretResult.secretText);
            }
        }
    }

    public async postProvision(
        apimPluginConfig: IApimPluginConfig,
        aadPluginConfig: IAadPluginConfig,
        redirectUris: string[],
    ): Promise<void> {
        const objectId = AssertConfigNotEmpty(TeamsToolkitComponent.ApimPlugin, ApimPluginConfigKeys.apimClientAADObjectId, apimPluginConfig.apimClientAADObjectId);

        let existingAadInfo = await this.aadService.getAad(objectId);
        existingAadInfo = AssertNotEmpty('existingAadInfo', existingAadInfo);

        let data: IAadInfo | undefined;
        data = this.refreshRedirectUri(existingAadInfo.web?.redirectUris, redirectUris, data);
        data = this.refreshEnableIdTokenIssuance(
            existingAadInfo.web?.implicitGrantSettings?.enableIdTokenIssuance,
            data,
        );
        data = this.refreshRequiredResourceAccess(
            existingAadInfo.requiredResourceAccess,
            aadPluginConfig.clientId,
            aadPluginConfig.oauth2PermissionScopeId,
            data,
        );

        if (data) {
            await this.aadService.updateAad(objectId, data);
        }
    }

    private refreshEnableIdTokenIssuance(
        existing: boolean | undefined,
        data: IAadInfo | undefined,
    ): IAadInfo | undefined {
        if (existing !== true) {
            data = data ?? {};
            data.web = data.web ?? {};
            data.web.implicitGrantSettings = { enableIdTokenIssuance: true };
        }

        return data;
    }

    private refreshRedirectUri(
        existingRedirectUris: string[] | undefined,
        redirectUris: string[],
        data: IAadInfo | undefined,
    ): IAadInfo | undefined {
        existingRedirectUris = existingRedirectUris ?? [];
        const originLength = existingRedirectUris.length;
        for (let redirectUri of redirectUris) {
            if (!existingRedirectUris.find((uri) => uri === redirectUri)) {
                existingRedirectUris.push(redirectUri);
            }
        }

        if (originLength !== existingRedirectUris.length) {
            data = data ?? {};
            data.web = data.web ?? {};
            data.web.redirectUris = existingRedirectUris;
        }

        return data;
    }

    private refreshRequiredResourceAccess(
        existingRequiredResourceAccessList: IRequiredResourceAccess[] | undefined,
        resourceClientId: string,
        scopeId: string,
        data: IAadInfo | undefined,
    ): IAadInfo | undefined {
        existingRequiredResourceAccessList = existingRequiredResourceAccessList ?? [];
        let requiredResourceAccess = existingRequiredResourceAccessList.find(
            (o) => o.resourceAppId === resourceClientId,
        );
        if (!requiredResourceAccess) {
            requiredResourceAccess = { resourceAppId: resourceClientId };
            existingRequiredResourceAccessList.push(requiredResourceAccess);
        }

        const resourceAccess = requiredResourceAccess.resourceAccess?.find(
            (resourceAccess) => resourceAccess.id === scopeId && resourceAccess.type === 'Scope',
        );
        if (!resourceAccess) {
            requiredResourceAccess.resourceAccess = (requiredResourceAccess.resourceAccess ?? []).concat({
                id: scopeId,
                type: 'Scope',
            });
            data = data ?? {};
            data.requiredResourceAccess = existingRequiredResourceAccessList;
        }

        return data;
    }
}
