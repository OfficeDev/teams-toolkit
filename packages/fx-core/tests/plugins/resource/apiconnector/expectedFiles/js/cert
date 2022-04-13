const teamsfxSdk = require("@microsoft/teamsfx");

// Loads current app's configuration.
const teamsFx = new teamsfxSdk.TeamsFx();
// Initializes a new axios instance to call fake API.
const authProvider = new teamsfxSdk.CertificateAuthProvider(
  // Please add code to read your cert and private key, replace '<your-cert>' and '<your-private-key>' with actual value.
  // If you have a .pfx cert, you can use 'createPfxCertOption' function to initialize your cert option.
  teamsfxSdk.createPemCertOption("<your-cert>", "<your-private-key>")
);
const fakeClient = teamsfxSdk.createApiClient(
  teamsFx.getConfig("TEAMSFX_API_FAKE_ENDPOINT"),
  authProvider
);
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

You can refer https://aka.ms/teamsfx-connet-api to learn more. 
*/
