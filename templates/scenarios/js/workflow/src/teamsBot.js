const { TeamsActivityHandler } = require("botbuilder");

// An empty teams activity handler.
// You can add your customization code here to extend your bot logic if needed.
class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();
  }
}

module.exports.TeamsBot = TeamsBot;
