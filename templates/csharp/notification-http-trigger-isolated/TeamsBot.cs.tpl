using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Teams;

namespace {{SafeProjectName}}
{
    /// <summary>
    /// An empty bot handler.
    /// You can add your customization code here to extend your bot logic if needed.
    /// </summary>
    public class TeamsBot : TeamsActivityHandler
    {
        public override Task OnTurnAsync(ITurnContext turnContext, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }
}