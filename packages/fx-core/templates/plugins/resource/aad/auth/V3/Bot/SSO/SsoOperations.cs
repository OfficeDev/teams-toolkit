using Microsoft.Bot.Builder;
using Microsoft.Graph;
using Microsoft.TeamsFx.Configuration;

namespace {{YOUR_NAMESPACE}}.SSO;

public static class SsoOperations
{
    public static async Task ShowUserInfo(ITurnContext stepContext, string token, BotAuthenticationOptions botAuthOptions)
    {
        await stepContext.SendActivityAsync("Retrieving user information from Microsoft Graph ...");
        var authProvider = new DelegateAuthenticationProvider((request) =>
        {
            request.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            return Task.CompletedTask;
        });
        var graphClient = new GraphServiceClient(authProvider);
        var profile = await graphClient.Me.Request().GetAsync();
        await stepContext.SendActivityAsync($"You're logged in as {profile.DisplayName}");
    }
}