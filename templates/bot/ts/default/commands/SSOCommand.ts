import { IBotCommand } from "./IBotCommand";
import { ResponseType } from "@microsoft/microsoft-graph-client";
import { CardFactory } from "botbuilder";
import { createMicrosoftGraphClient, OnBehalfOfUserCredential } from "@microsoft/teamsfx";
import { DialogContext } from "botbuilder-dialogs";

export class SSOCommand implements IBotCommand {
  public commandKey = "show";

  async run(parameters: any): Promise<any> {
    const ssoDialog = parameters.ssoDialog;
    ssoDialog.commandHandler = this.showUserInfo;
    await ssoDialog.run(parameters.context, parameters.dialogState);
  }

  async showUserInfo(stepContext: DialogContext, ssoToken: string) {
    await stepContext.context.sendActivity("Call Microsoft Graph on behalf of user...");

    // Call Microsoft Graph on behalf of user
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
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
}
