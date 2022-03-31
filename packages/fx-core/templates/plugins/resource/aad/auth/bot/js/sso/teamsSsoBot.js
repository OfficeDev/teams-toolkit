import { ConversationState, MemoryStorage, TeamsActivityHandler, UserState } from "botbuilder";
import { showUserInfo } from "./showUserInfo";
import { SsoDialog } from "./ssoDialog";

export class TeamsSsoBot extends TeamsActivityHandler {
  constructor() {
    super();

    // Define the state store for your bot.
    // See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
    // A bot requires a state storage system to persist the dialog and user state between messages.
    const memoryStorage = new MemoryStorage();

    // Create conversation and user state with in-memory storage provider.
    this.conversationState = new ConversationState(memoryStorage);
    this.userState = new UserState(memoryStorage);
    this.dialog = new SsoDialog(new MemoryStorage(), ["User.Read"]);
    this.dialogState = this.conversationState.createProperty("DialogState");

    // Add commands that requires user authentication
    this.dialog.addCommand("ShowUserProfile", "show", showUserInfo);
    // call the `addCommand` function to add more customized commands

    this.onMessage(async (context, next) => {
      console.log("Running with Message Activity.");

      // Run the Dialog with the new message Activity.
      await this.dialog.run(context, this.dialogState);

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }

  async run(context) {
    await super.run(context);

    // Save any state changes. The load happened during the execution of the Dialog.
    await this.conversationState.saveChanges(context, false);
    await this.userState.saveChanges(context, false);
  }

  async handleTeamsSigninVerifyState(context, query) {
    console.log("Running dialog with signin/verifystate from an Invoke Activity.");
    await this.dialog.run(context, this.dialogState);
  }

  async handleTeamsSigninTokenExchange(context, query) {
    await this.dialog.run(context, this.dialogState);
  }

  async onSignInInvoke(context) {
    await this.dialog.run(context, this.dialogState);
  }
}
