import { TeamsActivityHandler, CardFactory, TurnContext } from "botbuilder";
import {
  MessageExtensionTokenResponse,
  handleMessageExtensionQueryWithSSO,
  OnBehalfOfCredentialAuthConfig,
  OnBehalfOfUserCredential,
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

const initialLoginEndpoint = process.env.INITIATE_LOGIN_ENDPOINT;

export class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();
  }

  public async handleTeamsMessagingExtensionQuery(context: TurnContext, query: any): Promise<any> {
    // eslint-disable-next-line no-secrets/no-secrets
    /**
     * User Code Here.
     * If query without token, no need to implement handleMessageExtensionQueryWithSSO;
     * Otherwise, just follow the sample code below to modify the user code.
     */
    return await handleMessageExtensionQueryWithSSO(
      context,
      oboAuthConfig,
      initialLoginEndpoint,
      "User.Read",
      async (token: MessageExtensionTokenResponse) => {
        // User Code

        // Init OnBehalfOfUserCredential instance with SSO token
        const credential = new OnBehalfOfUserCredential(token.ssoToken, oboAuthConfig);

        // Create an instance of the TokenCredentialAuthenticationProvider by passing the tokenCredential instance and options to the constructor
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
          scopes: ["User.Read"],
        });

        // Initialize Graph client instance with authProvider
        const graphClient = Client.initWithMiddleware({
          authProvider: authProvider,
        });

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
