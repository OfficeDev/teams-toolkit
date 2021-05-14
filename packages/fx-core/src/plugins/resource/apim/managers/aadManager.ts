// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { ApimPluginConfigKeys, TeamsToolkitComponent } from "../constants";
import { AssertConfigNotEmpty, AssertNotEmpty, BuildError, InvalidAadObjectId } from "../error";
import { IAadInfo, IRequiredResourceAccess } from "../interfaces/IAadResource";
import { IAadPluginConfig, IApimPluginConfig } from "../config";
import { AadService } from "../services/aadService";
import { Lazy } from "../utils/commonUtils";
import { NamingRules } from "../utils/namingRules";

export class AadManager {
  private readonly logger?: LogProvider;
  private readonly telemetryReporter?: TelemetryReporter;
  private readonly lazyAadService: Lazy<AadService>;

  constructor(
    lazyAadService: Lazy<AadService>,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ) {
    this.logger = logger;
    this.telemetryReporter = telemetryReporter;
    this.lazyAadService = lazyAadService;
  }

  public async provision(apimPluginConfig: IApimPluginConfig, appName: string): Promise<void> {
    const aadService: AadService = await this.lazyAadService.getValue();
    if (!apimPluginConfig.apimClientAADObjectId) {
      const aadInfo = await aadService.createAad(NamingRules.aadDisplayName.sanitize(appName));
      apimPluginConfig.apimClientAADObjectId = AssertNotEmpty("id", aadInfo.id);
      apimPluginConfig.apimClientAADClientId = AssertNotEmpty("appId", aadInfo.appId);
      const secretResult = await aadService.addSecret(
        apimPluginConfig.apimClientAADObjectId,
        NamingRules.aadSecretDisplayName.sanitize(appName)
      );
      apimPluginConfig.apimClientAADClientSecret = AssertNotEmpty(
        "secretText",
        secretResult.secretText
      );
    } else {
      const existingAadInfo = await aadService.getAad(apimPluginConfig.apimClientAADObjectId);
      if (!existingAadInfo) {
        throw BuildError(InvalidAadObjectId, apimPluginConfig.apimClientAADObjectId);
      }
      apimPluginConfig.apimClientAADClientId = AssertNotEmpty("appId", existingAadInfo.appId);

      if (!apimPluginConfig.apimClientAADClientSecret) {
        const secretResult = await aadService.addSecret(
          apimPluginConfig.apimClientAADObjectId,
          NamingRules.aadSecretDisplayName.sanitize(appName)
        );
        apimPluginConfig.apimClientAADClientSecret = AssertNotEmpty(
          "secretText",
          secretResult.secretText
        );
      }
    }
  }

  public async postProvision(
    apimPluginConfig: IApimPluginConfig,
    aadPluginConfig: IAadPluginConfig,
    redirectUris: string[]
  ): Promise<void> {
    const aadService: AadService = await this.lazyAadService.getValue();
    const objectId = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.apimClientAADObjectId,
      apimPluginConfig.apimClientAADObjectId
    );

    let existingAadInfo = await aadService.getAad(objectId);
    existingAadInfo = AssertNotEmpty("existingAadInfo", existingAadInfo);

    let data: IAadInfo | undefined;
    data = this.refreshRedirectUri(existingAadInfo.web?.redirectUris, redirectUris, data);
    data = this.refreshEnableIdTokenIssuance(
      existingAadInfo.web?.implicitGrantSettings?.enableIdTokenIssuance,
      data
    );
    data = this.refreshRequiredResourceAccess(
      existingAadInfo.requiredResourceAccess,
      aadPluginConfig.clientId,
      aadPluginConfig.oauth2PermissionScopeId,
      data
    );

    if (data) {
      await aadService.updateAad(objectId, data);
    }
  }

  private refreshEnableIdTokenIssuance(
    existing: boolean | undefined,
    data: IAadInfo | undefined
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
    data: IAadInfo | undefined
  ): IAadInfo | undefined {
    existingRedirectUris = existingRedirectUris ?? [];
    const originLength = existingRedirectUris.length;
    for (const redirectUri of redirectUris) {
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
    data: IAadInfo | undefined
  ): IAadInfo | undefined {
    existingRequiredResourceAccessList = existingRequiredResourceAccessList ?? [];
    let requiredResourceAccess = existingRequiredResourceAccessList.find(
      (o) => o.resourceAppId === resourceClientId
    );
    if (!requiredResourceAccess) {
      requiredResourceAccess = { resourceAppId: resourceClientId };
      existingRequiredResourceAccessList.push(requiredResourceAccess);
    }

    const resourceAccess = requiredResourceAccess.resourceAccess?.find(
      (resourceAccess) => resourceAccess.id === scopeId && resourceAccess.type === "Scope"
    );
    if (!resourceAccess) {
      requiredResourceAccess.resourceAccess = (requiredResourceAccess.resourceAccess ?? []).concat({
        id: scopeId,
        type: "Scope",
      });
      data = data ?? {};
      data.requiredResourceAccess = existingRequiredResourceAccessList;
    }

    return data;
  }
}
