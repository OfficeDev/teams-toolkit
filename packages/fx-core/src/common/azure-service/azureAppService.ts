import { ServiceType } from "./interfaces";
import { Inputs, TokenProvider, Void } from "@microsoft/teamsfx-api";
import { azureWebSiteDeploy } from "./utils";
import { AzureService } from "./azureService";

const resourceId = "provisionOutputs.webAppOutput.value.webAppResourceId";
const hostName = "provisionOutputs.webAppOutput.value.validDomain";
const webAppEndpoint = "provisionOutputs.webAppOutput.value.siteEndpoint";
const endpointAsParam = "webAppProvision.outputs.webAppEndpoint";

export class AzureAppServiceHosting extends AzureService {
  configurable = true;
  hostType = ServiceType.AppService;
  reference = {
    resourceId: resourceId,
    hostName: hostName,
    webAppEndpoint: webAppEndpoint,
    endpointAsParam: endpointAsParam,
  };

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
