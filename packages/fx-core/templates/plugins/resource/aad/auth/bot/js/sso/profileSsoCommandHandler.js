const {
  OnBehalfOfUserCredential,
  createMicrosoftGraphClientWithCredential,
} = require("@microsoft/teamsfx");
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
    // Add scope for your Azure AD app. For example: Mail.Read, etc.
    const graphClient = createMicrosoftGraphClientWithCredential(oboCredential, ["User.Read"]);

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
