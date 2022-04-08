import { createMicrosoftGraphClient, TeamsFx } from "@microsoft/teamsfx";

export async function showUserInfo(context, ssoToken) {
  await context.sendActivity("Retrieving user information from Microsoft Graph ...");
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
