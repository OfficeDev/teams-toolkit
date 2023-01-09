// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../../interface/stepDriver";
import { DriverContext } from "../../interface/commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { AzureZipDeployDriver } from "./AzureZipDeployDriver";

const ACTION_NAME = "azureFunctions/deploy";

@Service(ACTION_NAME)
export class AzureFunctionDeployDriver implements StepDriver {
  readonly description: string = getLocalizedString(
    "driver.deploy.deployToAzureFunctionsDescription"
  );
  private static readonly SERVICE_NAME = "Azure Function App";
  private static readonly SUMMARY = [
    // eslint-disable-next-line no-secrets/no-secrets
    getLocalizedString("driver.deploy.azureFunctionsDeploySummary"),
  ];
  private static readonly SUMMARY_PREPARE = [
    getLocalizedString("driver.deploy.notice.deployDryRunComplete"),
  ];

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new AzureZipDeployDriver(
      args,
      context,
      AzureFunctionDeployDriver.SERVICE_NAME,
      AzureFunctionDeployDriver.SUMMARY,
      AzureFunctionDeployDriver.SUMMARY_PREPARE
    );
    return (await impl.run()).result;
  }

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const impl = new AzureZipDeployDriver(
      args,
      ctx,
      AzureFunctionDeployDriver.SERVICE_NAME,
      AzureFunctionDeployDriver.SUMMARY,
      AzureFunctionDeployDriver.SUMMARY_PREPARE
    );
    return await impl.run();
  }
}
