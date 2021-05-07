import {
  ActionTypes,
  CardFactory,
  TurnContext,
  TextFormatTypes,
} from "botbuilder";
import { ComponentDialog, DialogContext } from "botbuilder-dialogs";

export class RootDialog extends ComponentDialog {
  constructor(id: string) {
    super(id);
  }

  async onBeginDialog(innerDc: DialogContext, options: {} | undefined) {
    const result = await this.interrupt(innerDc);
    if (result) {
      return result;
    }

    return await super.onBeginDialog(innerDc, options);
  }

  async onContinueDialog(innerDc: DialogContext) {
    return await super.onContinueDialog(innerDc);
  }

  async interrupt(innerDc: DialogContext) {
    const removedMentionText = TurnContext.removeRecipientMention(
      innerDc.context.activity
    );
    const text = removedMentionText.toLowerCase().replace(/\n|\r/g, ""); // Remove the line break
    switch (text) {
      case "show": {
        if (innerDc.context.activity.conversation.isGroup) {
          await innerDc.context.sendActivity(
            'Sorry, currently TeamsFX SDK hasn\'t support Group/Team/Meeting Bot SSO. To try this command please install this app as Personal Bot and send "show".'
          );
          return await innerDc.cancelAllDialogs();
        }
        break;
      }
      case "intro": {
        const cardButtons = [
          { type: ActionTypes.ImBack, title: "Show Profile", value: "show" },
        ];
        const card = CardFactory.heroCard("Introduction", null, cardButtons, {
          text: `This Bot has implemented single sign-on (SSO) using Teams Account 
                      which user logged in Teams client, check <a href=\"placeholder\">TeamsFx authentication document</a> 
                      and code in <pre>bot/dialogs/mainDialog.js</pre> to learn more about SSO.
                      Type <strong>show</strong> or click the button below to show your profile by calling Microsoft Graph API with SSO.
                      To learn more about building Bot using Microsoft Teams Framework, please refer to the <a href=\"placeholder\">TeamsFx document</a> .`,
        });

        await innerDc.context.sendActivity({ attachments: [card] });
        return await innerDc.cancelAllDialogs();
      }
      default: {
        if (innerDc.context.activity.textFormat === TextFormatTypes.Plain) {
          const cardButtons = [
            {
              type: ActionTypes.ImBack,
              title: "Show introduction card",
              value: "intro",
            },
          ];
          const card = CardFactory.heroCard("", null, cardButtons, {
            text: `This is a hello world Bot built by Microsoft Teams Framework, 
                      which is designed only for illustration Bot purpose. This Bot by default will not handle any specific question or task. 
                      Please type <strong>intro</strong> to see the introduction card.`,
          });
          await innerDc.context.sendActivity({ attachments: [card] });
        }
        return await innerDc.cancelAllDialogs();
      }
    }
  }
}
