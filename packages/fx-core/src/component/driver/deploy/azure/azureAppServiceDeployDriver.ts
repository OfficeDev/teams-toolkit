// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Siglud <siglud@gmail.com>
 */

import { ExecutionResult, StepDriver } from "../../interface/stepDriver";
import { Service } from "typedi";
import { DriverContext } from "../../interface/commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { AzureZipDeployImpl } from "./impl/AzureZipDeployImpl";

const ACTION_NAME = "azureAppService/zipDeploy";

@Service(ACTION_NAME)
export class AzureAppServiceDeployDriver implements StepDriver {
  readonly description: string = getLocalizedString(
    "driver.deploy.deployToAzureAppServiceDescription"
  );
  private static readonly SERVICE_NAME = "Azure App Service";
  private static readonly SUMMARY = ["driver.deploy.azureAppServiceDeployDetailSummary"];
  private static readonly SUMMARY_PREPARE = ["driver.deploy.notice.deployDryRunComplete"];

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const impl = new AzureZipDeployImpl(
      args,
      ctx,
      AzureAppServiceDeployDriver.SERVICE_NAME,
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      AzureAppServiceDeployDriver.SUMMARY,
      AzureAppServiceDeployDriver.SUMMARY_PREPARE
    );
    return await impl.run();
  }
}
