using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Teams;
using Microsoft.Bot.Schema;
using Microsoft.Bot.Schema.Teams;
using AdaptiveCards;
using Newtonsoft.Json.Linq;

namespace {{SafeProjectName}}.Action;

public class ActionApp : TeamsActivityHandler
{ 
    private readonly string _adaptiveCardFilePath = Path.Combine(".", "Resources", "helloWorldCard.json");
    // Action.
    protected override async Task<MessagingExtensionActionResponse> OnTeamsMessagingExtensionSubmitActionAsync(ITurnContext<IInvokeActivity> turnContext, MessagingExtensionAction action, CancellationToken cancellationToken)
    {
        // The user has chosen to create a card by choosing the 'Create Card' context menu command.
        var adaptiveCardJson = await System.IO.File.ReadAllTextAsync(_adaptiveCardFilePath, cancellationToken);
        var template = new AdaptiveCards.Templating.AdaptiveCardTemplate(adaptiveCardJson);

        var actionData = ((JObject)action.Data).ToObject<CardResponse>();
        var data = new { title=actionData.Title, subTitle=actionData.SubTitle, text=actionData.Text };
        var adaptiveCard = AdaptiveCard.FromJson(template.Expand(data)).Card;
        var attachments = new MessagingExtensionAttachment() 
        { 
            ContentType = "application/vnd.microsoft.card.adaptive",
            Content = adaptiveCard
        };

        return new MessagingExtensionActionResponse
        {
            ComposeExtension = new MessagingExtensionResult
            {
                Type = "result",
                AttachmentLayout = "list",
                Attachments = new[] { attachments }
            }
        };
    }
}

internal class CardResponse
{
    public string Title { get; set; }
    public string SubTitle { get; set; }
    public string Text { get; set; }
}