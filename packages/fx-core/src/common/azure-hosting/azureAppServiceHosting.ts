import { AzureHosting } from "./azureHosting";
import { BicepContext, ServiceType } from "./interfaces";
import { Inputs, ResourceTemplate, TokenProvider, Void } from "@microsoft/teamsfx-api";
import { generateBicepFromFile } from "../tools";
import * as path from "path";
import { azureWebSiteDeploy } from "./utils";
import { Bicep } from "../constants";
import { AppServiceBicepConstant } from "./hostingConstant";

const resourceId = "provisionOutputs.webAppOutput.value.webAppResourceId";
const hostName = "provisionOutputs.webAppOutput.value.validDomain";
const webAppEndpoint = "provisionOutputs.webAppOutput.value.siteEndpoint";
const endpointAsParam = "webAppProvision.outputs.webAppEndpoint";

export class AzureAppServiceHosting extends AzureHosting {
  configurable = true;
  hostType = ServiceType.AppService;
  reference = {
    resourceId: resourceId,
    hostName: hostName,
    webAppEndpoint: webAppEndpoint,
    endpointAsParam: endpointAsParam,
  };

  async updateBicep(bicepContext: BicepContext, pluginId: string): Promise<ResourceTemplate> {
    const bicepTemplateDir = this.getBicepTemplateFolder();
    const configModule = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ConfigFileName),
      bicepContext
    );
    const configModuleRes = AzureHosting.replacePluginId(configModule, pluginId);
    return {
      Reference: {
        resourceId: AppServiceBicepConstant.resourceId,
        hostName: AppServiceBicepConstant.hostName,
        webAppEndpoint: AppServiceBicepConstant.webAppEndpoint,
      },
      Configuration: {
        Modules: { [this.hostType]: configModuleRes },
      },
    };
  }

  async deploy(
    inputs: Inputs,
    tokenProvider: TokenProvider,
    buffer: Buffer,
    siteName: string
  ): Promise<Void> {
    await super.deploy(inputs, tokenProvider, buffer, siteName);
    await azureWebSiteDeploy(inputs, tokenProvider, buffer, siteName);
    return Void;
  }
}
