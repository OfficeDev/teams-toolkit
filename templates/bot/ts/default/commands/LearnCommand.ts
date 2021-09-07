import { IBotCommand } from "./IBotCommand";
import { Utils } from "../utils";
const rawLearnCard = require("../adaptiveCards/welcome.json");

export class LearnCommand implements IBotCommand {
  public commandKey = "welcome";

  async run(parameters: any): Promise<any> {
    const card = Utils.renderAdaptiveCard(rawLearnCard);
    return await parameters.context.sendActivity({ attachments: [card] });
  }
}
