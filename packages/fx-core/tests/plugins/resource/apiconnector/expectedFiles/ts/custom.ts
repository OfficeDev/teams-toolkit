import { TeamsFx, createApiClient, AuthProvider } from "@microsoft/teamsfx";
import { AxiosRequestConfig } from "axios";

// The custom authProvider should implement the AuthProvider interface.
// Here is a sample authProvider class. It will set custom property in the request header
class CustomAuthProvider implements AuthProvider {
  customProperty: string;
  customValue: string;

  constructor(customProperty: string, customValue: string) {
    this.customProperty = customProperty;
    this.customValue = customValue;
  }

  AddAuthenticationInfo: (config: AxiosRequestConfig) => Promise<AxiosRequestConfig> = async (
    config
  ) => {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers[this.customProperty] = this.customValue;
    return config;
  };
}

// Loads current app's configuration and use app for auth, the sample uses client credential flow to acquire token for your API.
const teamsFx = new TeamsFx();

const authProvider = new CustomAuthProvider(
  // You can also set the parameters from the loaded config.
  //  teamsFx.getConfig("API_FAKE_CUSTOM_PROPERTY"),
  //  teamsFx.getConfig("API_FAKE_CUSTOM_VALUE")
  "customPropery",
  "customValue"
);
// Initializes a new axios instance to call fake API.
const fakeClient = createApiClient(teamsFx.getConfig("API_FAKE_ENDPOINT"), authProvider);
export { fakeClient };

/* 
You can now call fake APIs without worrying about authentication. 
Here is an example for a GET request to "relative_path_of_target_api": 
const result = await fakeClient.get("relative_path_of_target_api"); 

You can refer https://aka.ms/teamsfx-connect-api to learn more. 
*/

/* 
Setting API configuration for cloud environment: 
We have already set the configuration to .env.teamsfx.local based on your answers. 
Before you deploy your code to cloud using TeamsFx, please follow https://aka.ms/teamsfx-add-appsettings to add following app settings with appropriate value to your Azure environment: 
TEAMSFX_API_FAKE_ENDPOINT
TEAMSFX_API_FAKE_CUSTOM_PROPERTY
TEAMSFX_API_FAKE_CUSTOM_VALUE

You can refer https://aka.ms/teamsfx-connet-api to learn more. 
*/
