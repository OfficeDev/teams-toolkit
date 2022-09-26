const { createMicrosoftGraphClient, TeamsFx } = require("@microsoft/teamsfx");
require("isomorphic-fetch");

class ProfileSsoCommandHandler {
  triggerPatterns = "profile";

  async handleCommandReceived(context, message, tokenResponse) {
    await context.sendActivity("Retrieving user information from Microsoft Graph ...");

    // Init TeamsFx instance with SSO token
    const teamsfx = new TeamsFx().setSsoToken(tokenResponse.ssoToken);

    // Add scope for your Azure AD app. For example: Mail.Read, etc.
    const graphClient = createMicrosoftGraphClient(teamsfx, ["User.Read"]);

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
