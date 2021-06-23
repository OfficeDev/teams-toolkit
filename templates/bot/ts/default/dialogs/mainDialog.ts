import { Dialog, DialogSet, DialogTurnStatus, WaterfallDialog } from "botbuilder-dialogs";
import { RootDialog } from "./rootDialog";
import {
  ActivityTypes,
  CardFactory,
  Storage,
  tokenExchangeOperationName,
  TurnContext,
} from "botbuilder";
import { ResponseType } from "@microsoft/microsoft-graph-client";
import {
  createMicrosoftGraphClient,
  loadConfiguration,
  OnBehalfOfUserCredential,
  TeamsBotSsoPrompt,
} from "@microsoft/teamsfx";
import "isomorphic-fetch";

const MAIN_DIALOG = "MainDialog";
const MAIN_WATERFALL_DIALOG = "MainWaterfallDialog";
const TEAMS_SSO_PROMPT_ID = "TeamsFxSsoPrompt";

export class MainDialog extends RootDialog {
  private requiredScopes: string[] = ["User.Read"]; // hard code the scopes for demo purpose only
  private dedupStorage: Storage;
  private dedupStorageKeys: string[];

  // Developer controlls the lifecycle of credential provider, as well as the cache in it.
  // In this sample the provider is shared in all conversations
  constructor(dedupStorage: Storage) {
    super(MAIN_DIALOG);
    loadConfiguration();
    this.addDialog(
      new TeamsBotSsoPrompt(TEAMS_SSO_PROMPT_ID, {
        scopes: this.requiredScopes,
        endOnInvalidMessage: true,
      })
    );

    this.addDialog(
      new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
        this.ssoStep.bind(this),
        this.dedupStep.bind(this),
        this.showUserInfo.bind(this),
      ])
    );

    this.initialDialogId = MAIN_WATERFALL_DIALOG;
    this.dedupStorage = dedupStorage;
    this.dedupStorageKeys = [];
  }

  /**
   * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
   * If no dialog is active, it will start the default dialog.
   * @param {*} dialogContext
   */
  async run(context: TurnContext, accessor: any) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(context);
    const results = await dialogContext.continueDialog();
    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  async ssoStep(stepContext: any) {
    return await stepContext.beginDialog(TEAMS_SSO_PROMPT_ID);
  }

  async dedupStep(stepContext: any) {
    const tokenResponse = stepContext.result;
    // Only dedup after ssoStep to make sure that all Teams client would receive the login request
    if (tokenResponse && (await this.shouldDedup(stepContext.context))) {
      return Dialog.EndOfTurn;
    }
    return await stepContext.next(tokenResponse);
  }

  async showUserInfo(stepContext: any) {
    const tokenResponse = stepContext.result;
    if (tokenResponse) {
      await stepContext.context.sendActivity("Call Microsoft Graph on behalf of user...");

      // Call Microsoft Graph on behalf of user
      const oboCredential = new OnBehalfOfUserCredential(tokenResponse.ssoToken);
      const graphClient = createMicrosoftGraphClient(oboCredential, ["User.Read"]);
      const me = await graphClient.api("/me").get();
      if (me) {
        await stepContext.context.sendActivity(
          `You're logged in as ${me.displayName} (${me.userPrincipalName})${
            me.jobTitle ? `; your job title is: ${me.jobTitle}` : ""
          }.`
        );

        // show user picture
        let photoBinary: ArrayBuffer;
        try {
          photoBinary = await graphClient
            .api("/me/photo/$value")
            .responseType(ResponseType.ARRAYBUFFER)
            .get();
        } catch {
          // Just continue when failing to get the photo.
          return await stepContext.endDialog();
        }
        const buffer = Buffer.from(photoBinary);
        const imageUri = "data:image/png;base64," + buffer.toString("base64");
        const card = CardFactory.thumbnailCard("User Picture", CardFactory.images([imageUri]));
        await stepContext.context.sendActivity({ attachments: [card] });
      } else {
        await stepContext.context.sendActivity("Getting profile from Microsoft Graph failed! ");
      }

      return await stepContext.endDialog();
    }

    await stepContext.context.sendActivity("Token exchange was not successful please try again.");
    return await stepContext.endDialog();
  }

  async onEndDialog(context: TurnContext) {
    const conversationId = context.activity.conversation.id;
    const currentDedupKeys = this.dedupStorageKeys.filter((key) => key.indexOf(conversationId) > 0);
    await this.dedupStorage.delete(currentDedupKeys);
    this.dedupStorageKeys = this.dedupStorageKeys.filter((key) => key.indexOf(conversationId) < 0);
  }

  // If a user is signed into multiple Teams clients, the Bot might receive a "signin/tokenExchange" from each client.
  // Each token exchange request for a specific user login will have an identical activity.value.Id.
  // Only one of these token exchange requests should be processed by the bot.  For a distributed bot in production,
  // this requires a distributed storage to ensure only one token exchange is processed.
  async shouldDedup(context: TurnContext): Promise<boolean> {
    const storeItem = {
      eTag: context.activity.value.id,
    };

    const key = this.getStorageKey(context);
    const storeItems = { [key]: storeItem };

    try {
      await this.dedupStorage.write(storeItems);
      this.dedupStorageKeys.push(key);
    } catch (err) {
      if (err instanceof Error && err.message.indexOf("eTag conflict")) {
        return true;
      }
      throw err;
    }
    return false;
  }

  getStorageKey(context: TurnContext): string {
    if (!context || !context.activity || !context.activity.conversation) {
      throw new Error("Invalid context, can not get storage key!");
    }
    const activity = context.activity;
    const channelId = activity.channelId;
    const conversationId = activity.conversation.id;
    if (activity.type !== ActivityTypes.Invoke || activity.name !== tokenExchangeOperationName) {
      throw new Error("TokenExchangeState can only be used with Invokes of signin/tokenExchange.");
    }
    const value = activity.value;
    if (!value || !value.id) {
      throw new Error("Invalid signin/tokenExchange. Missing activity.value.id.");
    }
    return `${channelId}/${conversationId}/${value.id}`;
  }
}
