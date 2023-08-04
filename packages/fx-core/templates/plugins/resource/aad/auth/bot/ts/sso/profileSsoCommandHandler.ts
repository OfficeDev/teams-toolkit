import { Activity, TurnContext } from "botbuilder";
import {
  CommandMessage,
  TriggerPatterns,
  TeamsFxBotSsoCommandHandler,
  TeamsBotSsoPromptTokenResponse,
  OnBehalfOfUserCredential,
  OnBehalfOfCredentialAuthConfig,
} from "@microsoft/teamsfx";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import "isomorphic-fetch";

const oboAuthConfig: OnBehalfOfCredentialAuthConfig = {
  authorityHost: process.env.M365_AUTHORITY_HOST,
  clientId: process.env.M365_CLIENT_ID,
  tenantId: process.env.M365_TENANT_ID,
  clientSecret: process.env.M365_CLIENT_SECRET,
};

export class ProfileSsoCommandHandler implements TeamsFxBotSsoCommandHandler {
  triggerPatterns: TriggerPatterns = "profile";

  async handleCommandReceived(
    context: TurnContext,
    message: CommandMessage,
    tokenResponse: TeamsBotSsoPromptTokenResponse
  ): Promise<string | Partial<Activity> | void> {
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
