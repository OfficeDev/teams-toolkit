namespace {{ProjectName}}.Commands
{
    using Microsoft.Bot.Builder;
    using Microsoft.TeamsFx.Conversation;

    /// <summary>
    /// The <see cref="HelloWorldCommandHandler"/> registers a pattern with the <see cref="ITeamsCommandHandler"/> and 
    /// responds with an Adaptive Card if the user types the <see cref="TriggerPatterns"/>.
    /// </summary>
    public class HelloWorldCommandHandler : ITeamsCommandHandler
    {
        private readonly ILogger<HelloWorldCommandHandler> _logger;
        private readonly string _adaptiveCardFilePath = Path.Combine(".", "Resources", "HelloWorldCard.json");

        public ITriggerPattern[] TriggerPatterns => new ITriggerPattern[]
        {
            new StringTrigger("helloworld")
        };

        public HelloWorldCommandHandler(ILogger<HelloWorldCommandHandler> logger)
        {
            _logger = logger;
        }

        public async Task<ICommandResponse> HandleCommandAsync(ITurnContext turnContext, CommandMessage message, CancellationToken cancellationToken = default)
        {
            _logger?.LogInformation($"Bot received message: {message.Text}");

            // Read adaptive card template
            var cardTemplate = await File.ReadAllTextAsync(_adaptiveCardFilePath, cancellationToken);

            // Render card and send response
            var activity = MessageFactory.Attachment(AdaptiveCardHelper.CreateAdaptiveCard(
                cardTemplate,
                new CardModel
                {
                    Title = "Your Hello World Bot is Running",
                    Body = "Congratulations! Your hello world bot is running. Click the documentation below to learn more about Bots and the Teams Toolkit.",
                }));

            return new ActivityCommandResponse(activity);
        }
    }
}
