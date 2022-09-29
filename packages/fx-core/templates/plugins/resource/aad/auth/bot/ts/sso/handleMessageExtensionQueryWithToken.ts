import { TeamsActivityHandler, CardFactory, TurnContext } from "botbuilder";
import {
  MessageExtensionTokenResponse,
  handleMessageExtensionQueryWithToken,
  TeamsFx,
  createMicrosoftGraphClient,
} from "@microsoft/teamsfx";
import "isomorphic-fetch";

export class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();
  }

  public async handleTeamsMessagingExtensionQuery(context: TurnContext, query: any): Promise<any> {
    /**
     * User Code Here.
     * If query without token, no need to implement handleMessageExntesionQueryWithToken;
     * Otherwise, just follow the sample code below to modify the user code.
     */
    return await handleMessageExtensionQueryWithToken(
      context,
      null,
      "User.Read",
      async (token: MessageExtensionTokenResponse) => {
        // User Code
        // Init TeamsFx instance with SSO token
        const teamsfx = new TeamsFx().setSsoToken(token.ssoToken);

        // Add scope for your Azure AD app. For example: Mail.Read, etc.
        const graphClient = createMicrosoftGraphClient(teamsfx, "User.Read");

        // Call graph api use `graph` instance to get user profile information.
        const profile = await graphClient.api("/me").get();

        // Organize thumbnailCard to display User's profile info.
        const thumbnailCard = CardFactory.thumbnailCard(profile.displayName, profile.mail);

        // Message Extension return the user profile info to user.
        return {
          composeExtension: {
            type: "result",
            attachmentLayout: "list",
            attachments: [thumbnailCard],
          },
        };
      }
    );
  }

  public async handleTeamsMessagingExtensionSelectItem(
    context: TurnContext,
    obj: any
  ): Promise<any> {
    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [CardFactory.heroCard(obj.name, obj.description)],
      },
    };
  }
}
