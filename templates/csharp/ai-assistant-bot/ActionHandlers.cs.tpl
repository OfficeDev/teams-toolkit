using Microsoft.Bot.Builder;
using Microsoft.Teams.AI.AI.Action;
using Microsoft.Teams.AI.AI;

namespace {{SafeProjectName}}
{
    public class ActionHandlers
    {
        [Action(AIConstants.HttpErrorActionName)]
        public async Task<string> OnHttpError([ActionTurnContext] ITurnContext turnContext)
        {
            await turnContext.SendActivityAsync("An AI request failed. Please try again later.");
            return AIConstants.StopCommand;
        }
    }
}
