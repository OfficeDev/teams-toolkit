import { AzureClientFactory } from "../../../../src/component/resource/azureAppService/azureLibs";
import "mocha";

describe("AzureClientFactory", () => {
  it("getWebSiteManagementClient", () => {
    const creds = {
      signRequest: () => {
        return;
      },
    };
    AzureClientFactory.getWebSiteManagementClient(creds as any, "");
  });
});
