namespace {{SafeProjectName}}
{
    using Microsoft.Bot.Builder;
    using System.Threading;
    using System.Threading.Tasks;

    /// <summary>
    /// An empty bot handler.
    /// You can add your customization code here to extend your bot logic if needed.
    /// </summary>
    public class TeamsBot : IBot
    {
        public Task OnTurnAsync(ITurnContext turnContext, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }
}
