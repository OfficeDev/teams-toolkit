import { CardFactory, Attachment } from "botbuilder";
import { IBotCommand } from "./commands/IBotCommand";
import { LearnCommand } from "./commands/LearnCommand";
import { SSOCommand } from "./commands/SSOCommand";
import { WelcomeCommand } from "./commands/WelcomeCommand";
const ACData = require("adaptivecards-templating");

export class Utils {
  // Bind AdaptiveCard with data
  static renderAdaptiveCard(rawCardTemplate: any, dataObj?: any): Attachment {
    const cardTemplate = new ACData.Template(rawCardTemplate);
    const cardWithData = cardTemplate.expand({ $root: dataObj });
    const card = CardFactory.adaptiveCard(cardWithData);
    return card;
  }

  static CommandClasses = [SSOCommand, WelcomeCommand, LearnCommand];

  static async triggerCommand(keyword: string, parameters: any): Promise<any> {
    await Promise.all(
      this.CommandClasses.map(async (commandClass) => {
        const commandInstance = new commandClass();
        if (commandInstance.commandKey == keyword.trim()) {
          return await commandInstance.run(parameters);
        }
      })
    );
  }
}
