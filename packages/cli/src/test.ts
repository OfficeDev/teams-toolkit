import AppStudioTokenProviderUserPassword from "./commonlib/appStudioLoginUserPassword";
import AzureAccountProviderUserPassword from "./commonlib/azureLoginUserPassword";
import GraphTokenProviderUserPassword from "./commonlib/graphLoginUserPassword";

(async () => {
  // {
  //     const provider = AppStudioTokenProviderUserPassword;
  //     console.log("AppStudioTokenProviderUserPassword.getAccessToken", await provider.getAccessToken());
  //     console.log("AppStudioTokenProviderUserPassword.getJsonObject", await provider.getJsonObject());
  // }
  // {
  //     const provider = AzureAccountProviderUserPassword;
  //     console.log("getAccountCredentialAsync.getAccountCredentialAsync",await provider.getAccountCredentialAsync());
  //     console.log("getIdentityCredentialAsync.getIdentityCredentialAsync", await (await provider.getIdentityCredentialAsync())!.getToken("https://database.windows.net//.default"));
  //     console.log("listSubscriptions.listSubscriptions",await provider.listSubscriptions());
  // }
  {
    const provider = GraphTokenProviderUserPassword;
    console.log("GraphTokenProviderUserPassword.getAccessToken", await provider.getAccessToken());
    console.log("GraphTokenProviderUserPassword.getJsonObject", await provider.getJsonObject());
  }
})();
