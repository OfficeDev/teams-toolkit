using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Teams;
using Microsoft.Bot.Schema;
using Microsoft.Bot.Builder.Dialogs;

namespace {Your_NameSpace}.SSO;

public class TeamsSsoBot<T> : TeamsActivityHandler where T : Dialog
{
    private readonly ILogger<TeamsSsoBot<T>> _logger;
    private readonly BotState _conversationState;
    private readonly Dialog _dialog;
    public TeamsSsoBot(ConversationState conversationState, T dialog, ILogger<TeamsSsoBot<T>> logger)
    {
        _conversationState = conversationState;
        _dialog = dialog;
        _logger = logger;
    }

    protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Receive message activity");
        var text = turnContext.Activity.Text;
        var removedMentionText = turnContext.Activity.RemoveRecipientMention();
        if (!string.IsNullOrEmpty(removedMentionText))
        {
            text = removedMentionText.Trim().ToLower();
        }

        // Trigger command by text
        if (text == "show")
        {
            await _dialog.RunAsync(turnContext, _conversationState.CreateProperty<DialogState>(nameof(DialogState)), cancellationToken);
        } else
        {
            await turnContext.SendActivityAsync(String.Format("Cannot find command: {0}", text));
        }
    }

    protected override async Task OnTeamsSigninVerifyStateAsync(ITurnContext<IInvokeActivity> turnContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Receive invoke activity of teams sign in verify state");
        await _dialog.RunAsync(turnContext, _conversationState.CreateProperty<DialogState>(nameof(DialogState)), cancellationToken);
    }

    protected override async Task OnSignInInvokeAsync(ITurnContext<IInvokeActivity> turnContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Receive invoke activity of sign in");
        await _dialog.RunAsync(turnContext, _conversationState.CreateProperty<DialogState>(nameof(DialogState)), cancellationToken);
    }

    public override async Task OnTurnAsync(ITurnContext turnContext, CancellationToken cancellationToken = default(CancellationToken))
    {
        await base.OnTurnAsync(turnContext, cancellationToken);
        await _conversationState.SaveChangesAsync(turnContext, false, cancellationToken).ConfigureAwait(false);
    }
}