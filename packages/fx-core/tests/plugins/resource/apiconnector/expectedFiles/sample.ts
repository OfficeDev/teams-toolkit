import { TeamsFx, createApiClient, BasicAuthProvider } from "@microsoft/teamsfx";

// Loads current app's configuration

const teamsFx = new TeamsFx();

// Initializes a new axios instance to call fake API
const authProvider = new BasicAuthProvider(
  teamsFx.getConfig("API_FAKE_USERNAME"),
  teamsFx.getConfig("API_FAKE_PASSWORD")
);
const fakeClient = createApiClient(teamsFx.getConfig["API_FAKE_ENDPOINT"], authProvider);

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

API_FAKE_ENDPOINT 

API_FAKE_USERNAME 

API_FAKE_PASSWORD 

 

You can refer https://aka.ms/teamsfx-connet-api to learn more. 

*/
