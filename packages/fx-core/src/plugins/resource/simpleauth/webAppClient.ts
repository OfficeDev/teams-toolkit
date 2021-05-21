// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import axios, { AxiosResponse } from "axios";
import * as fs from "fs-extra";
import * as _fs from "fs";
import { err, FxError, ok, PluginContext, Result, TimeConsumingTask, UserInterface, Void } from "@microsoft/teamsfx-api";
import { Constants, Messages } from "./constants";
import {
  CreateAppServicePlanError,
  CreateWebAppError,
  UpdateApplicationSettingsError,
  ZipDeployError,
} from "./errors";
import { ResultFactory } from "./result";
import { DialogUtils } from "./utils/dialog";
import { rsort } from "semver";

export class WebAppClient {
  private credentials: TokenCredentialsBase;
  private subscriptionId: string;
  private resourceGroupName: string;
  private appServicePlanName: string;
  private webAppName: string;
  private location: string;
  private webSiteManagementClient: WebSiteManagementClient;
  private ctx: PluginContext;

  constructor(
    credentials: TokenCredentialsBase,
    subscriptionId: string,
    resourceGroupName: string,
    appServicePlanName: string,
    webAppName: string,
    location: string,
    ctx: PluginContext
  ) {
    this.credentials = credentials;
    this.subscriptionId = subscriptionId;
    this.resourceGroupName = resourceGroupName;
    this.appServicePlanName = appServicePlanName;
    this.webAppName = webAppName;
    this.location = location;
    this.webSiteManagementClient = new WebSiteManagementClient(
      this.credentials,
      this.subscriptionId
    );
    this.ctx = ctx;
  }

  public async createWebApp(): Promise<string> {
    try {
      DialogUtils.progressBar?.next(Constants.ProgressBar.provision.createAppServicePlan);
      const appServicePlan = await this.webSiteManagementClient.appServicePlans.createOrUpdate(
        this.resourceGroupName,
        this.appServicePlanName,
        {
          location: this.location,
          sku: {
            name: this.getSkuName(),
          },
        }
      );
      this.ctx.logProvider?.info(
        Messages.getLog("appServicePlan is created: " + appServicePlan.name)
      );
    } catch (error) {
      if (error?.message?.includes(Constants.FreeServerFarmsQuotaErrorFromAzure)) {
        throw ResultFactory.UserError(
          CreateAppServicePlanError.name,
          CreateAppServicePlanError.message(Constants.FreeServerFarmsQuotaErrorToUser),
          error,
          undefined,
          Constants.FreeServerFarmsQuotaErrorHelpLink
        );
      }
      throw ResultFactory.SystemError(
        CreateAppServicePlanError.name,
        CreateAppServicePlanError.message(error?.message),
        error
      );
    }

    try {
      DialogUtils.progressBar?.next(Constants.ProgressBar.provision.createWebApp);
      const webApp = await this.webSiteManagementClient.webApps.createOrUpdate(
        this.resourceGroupName,
        this.webAppName,
        { location: this.location, serverFarmId: this.appServicePlanName }
      );
      this.ctx.logProvider?.info(Messages.getLog("webApp is created: " + webApp.name));

      return `https://${webApp.defaultHostName}`;
    } catch (error) {
      throw ResultFactory.SystemError(
        CreateWebAppError.name,
        CreateWebAppError.message(error?.message),
        error
      );
    }
  }

  public async zipDeploy(ui: UserInterface, filePath: string) {
    const token = await this.credentials.getToken();
    const stat = _fs.statSync(filePath);
    const _this = this;
    const cancelTokenSource = axios.CancelToken.source();
    const task: TimeConsumingTask<AxiosResponse<any>> = {
      name: Constants.ProgressBar.provision.zipDeploy,
      total: stat.size * 2,
      current: 0,
      message: "",
      isCanceled: false,
      async run(): Promise<Result<AxiosResponse<any>, FxError>> {
        return new Promise(async (resolve) => {
          try {
            const fileStream = _fs.createReadStream(filePath);
            fileStream.on("data", (buffer: Buffer) => {
              this.current += buffer.length;
              if (this.current === stat.size) this.message = "waiting for server response";
            });
            this.message = "Uploading zip package";
            const response = await axios({
              method: "POST",
              url: `https://${_this.webAppName}.scm.azurewebsites.net/api/zipdeploy`,
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
              },
              data: fileStream, //await fs.readFile(filePath),
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              cancelToken: cancelTokenSource.token,
            });
            this.current = this.total;
            resolve(ok(response));
          } catch (error) {
            resolve(
              err(
                ResultFactory.SystemError(
                  ZipDeployError.name,
                  ZipDeployError.message(error?.message),
                  error
                )
              )
            );
          }
        });
      },
      cancel() {
        cancelTokenSource.cancel();
        this.isCanceled = true;
      },
    };
    const res = await ui.runWithProgress(task);
    if (res.isOk()) {
      this.ctx.logProvider?.info(Messages.getLog(`zipdeploy is done! status:${res.value.status}`));
    } else {
      throw res.error;
    }
  }

  public async configWebApp(properties: { [propertyName: string]: string }) {
    try {
      await this.webSiteManagementClient.webApps.updateApplicationSettings(
        this.resourceGroupName,
        this.webAppName,
        {
          properties,
        }
      );
    } catch (error) {
      throw ResultFactory.SystemError(
        UpdateApplicationSettingsError.name,
        UpdateApplicationSettingsError.message(error?.message),
        error
      );
    }
  }

  /**
   * Allow users to set SKU name for App Service Plan as only 10 free App Service Plan is allowed in a Subscription.
   * The order is:
   * 1. 'skuName' config of 'fx-resource-simple-auth' in env.default.json file
   * 2. 'SIMPLE_AUTH_SKU_NAME' environment variable
   * 3. 'F1' Free Tier
   */
  private getSkuName(): string {
    const skuName = this.ctx.config.get(Constants.SimpleAuthPlugin.configKeys.skuName) as string;

    return skuName ?? process.env.SIMPLE_AUTH_SKU_NAME ?? "F1";
  }
}
