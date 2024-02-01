const { OnBehalfOfUserCredential } = require("@microsoft/teamsfx");
const { Client } = require("@microsoft/microsoft-graph-client");
const {
  TokenCredentialAuthenticationProvider,
} = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
require("isomorphic-fetch");

const oboAuthConfig = {
  authorityHost: process.env.M365_AUTHORITY_HOST,
  clientId: process.env.M365_CLIENT_ID,
  tenantId: process.env.M365_TENANT_ID,
  clientSecret: process.env.M365_CLIENT_SECRET,
};

class ProfileSsoCommandHandler {
  triggerPatterns = "profile";

  async handleCommandReceived(context, message, tokenResponse) {
    await context.sendActivity("Retrieving user information from Microsoft Graph ...");

    // Init OnBehalfOfUserCredential instance with SSO token
    const oboCredential = new OnBehalfOfUserCredential(tokenResponse.ssoToken, oboAuthConfig);

    // Create an instance of the TokenCredentialAuthenticationProvider by passing the tokenCredential instance and options to the constructor
    const authProvider = new TokenCredentialAuthenticationProvider(oboCredential, {
      scopes: ["User.Read"],
    });

    // Initialize Graph client instance with authProvider
    const graphClient = Client.initWithMiddleware({
      authProvider: authProvider,
    });

    // Call graph api use `graph` instance to get user profile information
    const me = await graphClient.api("/me").get();

    if (me) {
      // Bot will send the user profile info to user
      return `Your command is '${message.text}' and you're logged in as ${me.displayName} (${me.userPrincipalName}).`;
    } else {
      return "Could not retrieve profile information from Microsoft Graph.";
    }
  }
}

module.exports = {
  ProfileSsoCommandHandler,
};
