import { IBotCommand } from "./IBotCommand";
import { Utils } from "../utils";
const rawWelcomeCard = require("../adaptiveCards/welcome.json");

export class WelcomeCommand implements IBotCommand {
  public commandKey = "welcome";

  async run(parameters: any): Promise<any> {
    const card = Utils.renderAdaptiveCard(rawWelcomeCard);
    return await parameters.context.sendActivity({ attachments: [card] });
  }
}
