using Microsoft.Bot.Builder;
using Microsoft.Bot.Schema;
using Microsoft.TeamsAI;
using Microsoft.TeamsAI.State;

namespace {{SafeProjectName}};

public class AIBotApplication : Application<TurnState, TurnStateManager>
{
    public AIBotApplication(ApplicationOptions<TurnState, TurnStateManager> options) : base(options) { 
        AI.ImportActions(this);
    }

    protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, TurnState turnState, CancellationToken cancellationToken)
    {
        await AI.ChainAsync(turnContext, turnState, "Chat", AI.Options, cancellationToken);
    }

    protected override async Task OnMembersAddedAsync(IList<ChannelAccount> membersAdded, ITurnContext<IConversationUpdateActivity> turnContext, TurnState turnState, CancellationToken cancellationToken)
    {
        await turnContext.SendActivityAsync(MessageFactory.Text("How can I help you today?"), cancellationToken);
    }
}