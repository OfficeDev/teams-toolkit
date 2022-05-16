namespace {{ProjectName}}
{
    using AdaptiveCards.Templating;
    using Microsoft.Bot.Schema;
    using Newtonsoft.Json;

    /// <summary>
    /// Provides utilities to build adaptive card.
    /// </summary>
    public static class AdaptiveCardHelper
    {
        /// <summary>
        /// Utility to build an adaptive card attachment for bot activity.
        /// </summary>
        /// <param name="cardJson">The content of the adaptive card template.</param>
        /// <param name="dataObj">The data object used to render the adaptive card.</param>
        /// <returns>An <see cref="Attachment"/> object with adaptive card content.</returns>
        public static Attachment CreateAdaptiveCard(string cardJson, object dataObj = null)
        {
            if (dataObj != null)
            {
                var template = new AdaptiveCardTemplate(cardJson);
                cardJson = template.Expand(dataObj);
            }

            var adaptiveCardAttachment = new Attachment
            {
                ContentType = "application/vnd.microsoft.card.adaptive",
                Content = JsonConvert.DeserializeObject(cardJson),
            };

            return adaptiveCardAttachment;
        }
    }
}
