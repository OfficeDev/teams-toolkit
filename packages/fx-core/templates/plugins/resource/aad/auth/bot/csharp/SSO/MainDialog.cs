using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Extensions.Options;
using Microsoft.Graph;
using Microsoft.Identity.Client;
using Microsoft.TeamsFx.Bot;
using Microsoft.TeamsFx.Configuration;

namespace bowsong0812test02.SSO;

public class MainDialog: ComponentDialog
{
    ILogger<MainDialog> _logger;
    BotAuthenticationOptions _botAuthOptions;
    public MainDialog(IOptions<BotAuthenticationOptions> botAuthenticationOptions, ILogger<MainDialog> logger)
    {
        _logger = logger;

        try
        {
            _logger.LogTrace("Validate bot authentication configuration");
            _botAuthOptions = botAuthenticationOptions.Value;
        }
        catch (OptionsValidationException e)
        {
            throw new Exception($"Bot authentication config is missing or not correct with error: {e.Message}");
        }

        var settings = new TeamsBotSsoPromptSettings(_botAuthOptions, new string[] { "User.Read"});
        AddDialog(new TeamsBotSsoPrompt(nameof(TeamsBotSsoPrompt), settings));

        AddDialog(new WaterfallDialog(nameof(WaterfallDialog), new WaterfallStep[]
        {
            PromptStepAsync,
            CallGraphAPIStepAsync
        }));
        InitialDialogId = nameof(WaterfallDialog);

        _logger.LogInformation("Construct Main Dialog");
    }

    private async Task<DialogTurnResult> PromptStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Step: Prompt to get SSO token");
        return await stepContext.BeginDialogAsync(nameof(TeamsBotSsoPrompt), null, cancellationToken);
    }


    private async Task<DialogTurnResult> CallGraphAPIStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Step: call graph API");

        var tokenResponse = (TeamsBotSsoPromptTokenResponse)stepContext.Result;
        if (tokenResponse?.Token != null)
        {
            var cca = ConfidentialClientApplicationBuilder
                .Create(_botAuthOptions.ClientId)
                .WithClientSecret(_botAuthOptions.ClientSecret)
                .WithAuthority(_botAuthOptions.OAuthAuthority)
                .Build();

            // DelegateAuthenticationProvider is a simple auth provider implementation
            // that allows you to define an async function to retrieve a token
            // Alternatively, you can create a class that implements IAuthenticationProvider
            // for more complex scenarios
            var authProvider = new DelegateAuthenticationProvider((request) =>
            {
                request.Headers.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponse.Token);
                return Task.CompletedTask;
            });
            var graphClient = new GraphServiceClient(authProvider);
            var profile = await graphClient.Me.Request().GetAsync();
            await stepContext.Context.SendActivityAsync("Access token to call graph API: " + tokenResponse.Token);
            await stepContext.Context.SendActivityAsync($"You're logged in as {profile.DisplayName} ({profile.UserPrincipalName}); you job title is: {profile.JobTitle}");
        } 
        else
        {
            await stepContext.Context.SendActivityAsync(MessageFactory.Text("Login was not successful please try again."), cancellationToken);
        }

        return await stepContext.EndDialogAsync(cancellationToken: cancellationToken);
    }
}
