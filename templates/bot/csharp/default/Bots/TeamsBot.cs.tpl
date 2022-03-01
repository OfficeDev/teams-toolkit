using AdaptiveCards.Templating;

using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Teams;
using Microsoft.Bot.Schema;
using Microsoft.Bot.Schema.Teams;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace {{BlazorAppServer}}.Bots;

public class TeamsBot : TeamsActivityHandler
{
    private readonly string _welcomeAdaptiveCardTemplate = Path.Combine(".", "Resources", "WelcomeCardTemplate.json");
    private readonly string _learnAdaptiveCardTemplate = Path.Combine(".", "Resources", "LearnCardTemplate.json");
    private static readonly LikeCountObj likeCountObj = new LikeCountObj();

    protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
    {
        var text = turnContext.Activity.Text;
        var removedMentionText = turnContext.Activity.RemoveRecipientMention();
        if (!string.IsNullOrEmpty(removedMentionText))
        {
            text = turnContext.Activity.Text.Trim().ToLower();
        }

        // Trigger command by text
        if (text == "welcome")
            await turnContext.SendActivityAsync(MessageFactory.Attachment(CreateAdaptiveCardActivity(_welcomeAdaptiveCardTemplate, null)), cancellationToken);
        else if (text == "learn")
            await turnContext.SendActivityAsync(MessageFactory.Attachment(CreateAdaptiveCardActivity(_learnAdaptiveCardTemplate, likeCountObj)), cancellationToken);
    }

    protected override async Task OnMembersAddedAsync(IList<ChannelAccount> membersAdded, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        foreach (var member in membersAdded)
        {
            if (member.Id != turnContext.Activity.Recipient.Id)
            {
                await turnContext.SendActivityAsync(MessageFactory.Attachment(CreateAdaptiveCardActivity(_welcomeAdaptiveCardTemplate, null)), cancellationToken);
            }
        }
    }

    // Invoked when an action is taken on an Adaptive Card. The Adaptive Card sends an event to the Bot and this
    // method handles that event.
    protected override async Task<AdaptiveCardInvokeResponse> OnAdaptiveCardInvokeAsync(ITurnContext<IInvokeActivity> turnContext, AdaptiveCardInvokeValue invokeValue, CancellationToken cancellationToken)
    {
        // The verb "userlike" is sent from the Adaptive Card defined in Resources\LearnCardTemplate.json
        if (invokeValue.Action.Verb == "userlike")
        {
            likeCountObj.Add();
            var adaptiveCard = CreateAdaptiveCardActivity(_learnAdaptiveCardTemplate, likeCountObj);
            Activity updateActivity = new Activity();
            updateActivity.Type = "message";
            updateActivity.Id = turnContext.Activity.ReplyToId;
            updateActivity.Attachments = new List<Attachment> { adaptiveCard };
            await turnContext.UpdateActivityAsync(updateActivity);
        }
        var response = new AdaptiveCardInvokeResponse()
        {
            StatusCode = 200,
            Type = null,
            Value = null
        };
        return response;
    }

    // Bind AdaptiveCard with data
    private Attachment CreateAdaptiveCardActivity(string filePath, object dataObj)
    {
        var cardJSON = File.ReadAllText(filePath);
        if (dataObj != null)
        {
            AdaptiveCardTemplate template = new AdaptiveCardTemplate(cardJSON);
            cardJSON = template.Expand(dataObj);
        }
        var adaptiveCardAttachment = new Attachment
        {
            ContentType = "application/vnd.microsoft.card.adaptive",
            Content = JsonConvert.DeserializeObject(cardJSON),
        };
        return adaptiveCardAttachment;
    }
}

internal class LikeCountObj
{
    public int likeCount;

    public LikeCountObj()
    {
        likeCount = 0;
    }

    public void Add()
    {
        likeCount++;
    }
}