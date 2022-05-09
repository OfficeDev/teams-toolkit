// This file implements a function to call Graph API with TeamsFx SDK to get user profile with SSO token.

const { createMicrosoftGraphClient, TeamsFx } = require("@microsoft/teamsfx");

// If you need extra parameters, you can include the parameters in `addCommand`as parameter
async function showUserInfo(context, ssoToken) {
  await context.sendActivity("Retrieving user information from Microsoft Graph ...");

  // Init TeamsFx instance with SSO token
  const teamsfx = new TeamsFx().setSsoToken(ssoToken);
  const graphClient = createMicrosoftGraphClient(teamsfx, ["User.Read"]);
  const me = await graphClient.api("/me").get();
  if (me) {
    await context.sendActivity(
      `You're logged in as ${me.displayName} (${me.userPrincipalName})${
        me.jobTitle ? `; your job title is: ${me.jobTitle}` : ""
      }.`
    );
  } else {
    await context.sendActivity("Could not retrieve profile information from Microsoft Graph.");
  }

  return;
}

module.exports = {
  showUserInfo,
};
