// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { ApimPluginConfigKeys } from "../constants";
import { IApimPluginConfig, IAadPluginConfig } from "../config";
import { AadService } from "../services/aadService";
import { Lazy } from "../utils/commonUtils";

export class TeamsAppAadManager {
  private readonly logger: LogProvider | undefined;
  private readonly telemetryReporter: TelemetryReporter | undefined;
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

  public async postProvision(
    aadConfig: IAadPluginConfig,
    apimConfig: IApimPluginConfig
  ): Promise<void> {
    const aadService = await this.lazyAadService.getValue();
    const apimClientAADClientId = apimConfig.checkAndGet(
      ApimPluginConfigKeys.apimClientAADClientId
    );
    const data = { api: { knownClientApplications: [apimClientAADClientId] } };

    await aadService.createServicePrincipalIfNotExists(aadConfig.clientId);
    await aadService.updateAad(aadConfig.objectId, data);
  }
}
