using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Teams;
using Microsoft.Bot.Schema;

namespace {{SafeProjectName}}.Bot;

public class EchoBot : TeamsActivityHandler
{ 
    protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
    {
        string messageText = turnContext.Activity.RemoveRecipientMention().Trim();
        var replyText = $"Echo: {messageText}";
        await turnContext.SendActivityAsync(MessageFactory.Text(replyText), cancellationToken);
    }
    protected override async Task OnMembersAddedAsync(IList<ChannelAccount> membersAdded, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        var welcomeText = "Hi there! I'm a Teams bot that will echo what you said to me \U0001FAE1";
        foreach (var member in membersAdded)
        {
            if (member.Id != turnContext.Activity.Recipient.Id)
            {
                await turnContext.SendActivityAsync(MessageFactory.Text(welcomeText), cancellationToken);
            }
        }
    }
}

