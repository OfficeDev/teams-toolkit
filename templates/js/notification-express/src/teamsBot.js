const { TeamsActivityHandler } = require("botbuilder");

// Teams activity handler.
// You can add your customization code here to extend your bot logic if needed.
class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();

    // Listen to MembersAdded event, view https://docs.microsoft.com/en-us/microsoftteams/platform/resources/bot-v3/bots-notifications for more events
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          await context.sendActivity(
            "Welcome to the Notification Bot! I am designed to send you updates and alerts using Adaptive Cards triggered by HTTP post requests. " +
              "Please note that I am a notification-only bot and you can't interact with me. Follow the README in the project and stay tuned for notifications!"
          );
          break;
        }
      }
      await next();
    });
  }
}

module.exports.TeamsBot = TeamsBot;
