using Microsoft.Bot.Builder;
using Microsoft.Bot.Schema;
using Microsoft.TeamsAI;
using Microsoft.TeamsAI.State;

namespace {{SafeProjectName}};

public class AIBotApplication : Application<TurnState, TurnStateManager>
{
    public AIBotApplication(ApplicationOptions<TurnState, TurnStateManager> options) : base(options) { 
    }

    protected override async Task OnMembersAddedAsync(IList<ChannelAccount> membersAdded, ITurnContext<IConversationUpdateActivity> turnContext, TurnState turnState, CancellationToken cancellationToken)
    {
        await turnContext.SendActivityAsync(MessageFactory.Text("How can I help you today?"), cancellationToken);
    }
}