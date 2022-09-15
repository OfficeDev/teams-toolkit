using {{SafeProjectName}}.Models;
using AdaptiveCards.Templating;
using Microsoft.Bot.Builder;
using Microsoft.TeamsFx.Conversation;
using Newtonsoft.Json;

namespace {{SafeProjectName}}.CardActions
{
    public class DoStuffActionHandler : IAdaptiveCardActionHandler
    {
        private string _triggerVerb = "doStuff";
        private AdaptiveCardResponse _adaptiveCardResponse = AdaptiveCardResponse.ReplaceForInteractor;
        private readonly string _responseCardFilePath = Path.Combine(".", "Resources", "DoStuffActionResponse.json");

        public string TriggerVerb
        {
            get => _triggerVerb;
            set => _triggerVerb = value;
        }

        public AdaptiveCardResponse AdaptiveCardResponse
        {
            get => _adaptiveCardResponse;
            set => _adaptiveCardResponse = value;
        }

        public async Task<InvokeResponse> HandleActionInvokedAsync(ITurnContext turnContext, object cardData, CancellationToken cancellationToken = default)
        {
            // Read adaptive card template
            var cardTemplate = await File.ReadAllTextAsync(_responseCardFilePath, cancellationToken);

            // Render adaptive card content
            var cardContent = new AdaptiveCardTemplate(cardTemplate).Expand
            (
                new HelloWorldModel
                {
                    Title = "Hello World Bot",
                    Body = "Congratulations! Your task is processed successfully.",
                }
            );

            // Adaptive card
            return InvokeResponseFactory.AdaptiveCard(JsonConvert.DeserializeObject(cardContent));
        }
    }
}
