using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Teams;
using Microsoft.Bot.Schema;
using Microsoft.Bot.Schema.Teams;
using AdaptiveCards;
using Newtonsoft.Json.Linq;

namespace {{SafeProjectName}}.Action;

public class ActionApp : TeamsActivityHandler
{ 
    // Action.
    protected override Task<MessagingExtensionActionResponse> OnTeamsMessagingExtensionSubmitActionAsync(ITurnContext<IInvokeActivity> turnContext, MessagingExtensionAction action, CancellationToken cancellationToken)
    {
        // The user has chosen to create a card by choosing the 'Create Card' context menu command.
        var actionData = ((JObject)action.Data).ToObject<CardResponse>();
        var adaptiveCard = new AdaptiveCard(new AdaptiveSchemaVersion("1.4"))
        {
            Body = new List<AdaptiveElement>
            {
                new AdaptiveTextBlock
                {
                    Text = actionData.Title,
                    Size = AdaptiveTextSize.Large,
                    Wrap = true
                },
                new AdaptiveTextBlock
                {
                    Text = actionData.SubTitle,
                    Size = AdaptiveTextSize.Medium,
                    Wrap = true
                },
                new AdaptiveTextBlock
                {
                    Text = actionData.Text,
                    Size = AdaptiveTextSize.Small,
                    Wrap = true
                }
            }
        };
        var attachments = new MessagingExtensionAttachment() 
        { 
            ContentType = AdaptiveCard.ContentType,
            Content = adaptiveCard
        };

        return Task.FromResult(new MessagingExtensionActionResponse
        {
            ComposeExtension = new MessagingExtensionResult
            {
                Type = "result",
                AttachmentLayout = "list",
                Attachments = new[] { attachments }
            }
        });
    }
}

internal class CardResponse
{
    public string Title { get; set; }
    public string SubTitle { get; set; }
    public string Text { get; set; }
}