using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Schema;
using Microsoft.Extensions.Options;
using Microsoft.Graph;
using Microsoft.Identity.Client;
using Microsoft.TeamsFx.Bot;
using Microsoft.TeamsFx.Configuration;
using System.Threading;

namespace {Your_NameSpace}.SSO;

public class DialogConstants
{
    internal static readonly string COMMAND_ROUTE_DIALOG = "CommandRouteDialog";
    internal static readonly string TEAMS_SSO_PROMPT = "TeamsFxSsoPrompt";
}

public class SsoDialog : ComponentDialog
{
    ILogger<SsoDialog> _logger;
    BotAuthenticationOptions _botAuthOptions;
    Dictionary<string, string> _commandMapping = new Dictionary<string, string>();

    public SsoDialog(IOptions<BotAuthenticationOptions> botAuthenticationOptions, ILogger<SsoDialog> logger)
    {
        _logger = logger;
        InitialDialogId = DialogConstants.COMMAND_ROUTE_DIALOG;

        try
        {
            _logger.LogTrace("Validate bot authentication configuration");
            _botAuthOptions = botAuthenticationOptions.Value;
        }
        catch (OptionsValidationException e)
        {
            throw new Exception($"Bot authentication config is missing or not correct with error: {e.Message}");
        }

        var settings = new TeamsBotSsoPromptSettings(_botAuthOptions, new string[] { "User.Read" });
        AddDialog(new TeamsBotSsoPrompt(DialogConstants.TEAMS_SSO_PROMPT, settings));

        WaterfallDialog commandRouteDialog = new WaterfallDialog(
            DialogConstants.COMMAND_ROUTE_DIALOG,
            new WaterfallStep[]
            {
                CommandRouteStepAsync
            });
        AddDialog(commandRouteDialog);

        _logger.LogInformation("Construct Main Dialog");
    }

    public async Task RunAsync(ITurnContext context, IStatePropertyAccessor<DialogState> accessor)
    {
        DialogSet dialogSet = new DialogSet(accessor);
        dialogSet.Add(this);

        DialogContext dialogContext = await dialogSet.CreateContextAsync(context);
        DialogTurnResult results = await dialogContext.ContinueDialogAsync();
        if (results != null && results.Status == DialogTurnStatus.Empty)
        {
            await dialogContext.BeginDialogAsync(Id);
        }
    }

    public void addCommand(
        string commandId,
        string commandText,
        Func<ITurnContext, string, BotAuthenticationOptions, Task> operation)
    {
        if (_commandMapping.ContainsValue(commandId))
        {
            return;
        }
        _commandMapping.Add(commandText, commandId);

        WaterfallDialog dialog = new WaterfallDialog(
            commandId,
            new WaterfallStep[]
            {
            PromptStepAsync,
            async (WaterfallStepContext stepContext, CancellationToken cancellationToken) => {
                TeamsBotSsoPromptTokenResponse tokenResponce = (TeamsBotSsoPromptTokenResponse)stepContext.Result;
                var turnContext = stepContext.Context;
                try
                {
                    if (tokenResponce != null)
                    {
                        await operation(turnContext, tokenResponce.Token, _botAuthOptions);
                    } else
                    {
                        await turnContext.SendActivityAsync("Failed to retrieve user token from conversation context.");
                    }
                    return await stepContext.EndDialogAsync();
                } catch (Exception error)
                {
                    await turnContext.SendActivityAsync("Failed to retrieve user token from conversation context.");
                    await turnContext.SendActivityAsync(error.Message);
                    return await stepContext.EndDialogAsync();
                }
            }
        });
        AddDialog(dialog);
    }

    private async Task<DialogTurnResult> PromptStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Step: Prompt to get SSO token");
        try
        {
            return await stepContext.BeginDialogAsync(DialogConstants.TEAMS_SSO_PROMPT, null, cancellationToken);
        } catch (Exception error)
        {
            await stepContext.Context.SendActivityAsync("Failed to run SSO prompt");
            await stepContext.Context.SendActivityAsync(error.Message);
            return await stepContext.EndDialogAsync();
        }
    }

    private async Task<DialogTurnResult> CommandRouteStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Step: Route to pre-added commands");
        var turnContext = stepContext.Context;

        string text = turnContext.Activity.RemoveRecipientMention();
        if (text != null)
        {
            text = text.ToLower().Trim();
        }

        string commandId = MatchCommands(text);
        if (commandId != null)
        {
            return await stepContext.BeginDialogAsync(commandId);
        }

        await stepContext.Context.SendActivityAsync(String.Format("Cannot find command: {0}", text));
        return await stepContext.EndDialogAsync();
    }

    private string MatchCommands(string text)
    {
        if (_commandMapping.ContainsKey(text))
        {
            return _commandMapping[text];
        }

        return null;
    }
}
