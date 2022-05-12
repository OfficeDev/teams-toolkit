using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Bot.Builder.TraceExtensions;
using Microsoft.Bot.Connector.Authentication;

namespace {{ProjectName}};

public class AdapterWithErrorHandler : CloudAdapter
{
    public AdapterWithErrorHandler(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<IBotFrameworkHttpAdapter> logger)
        : base(BotFrameworkAuthenticationFactory.Create(null, validateAuthority: false, null, null, null, null, null, null, null,
            new PasswordServiceClientCredentialFactory(configuration["BOT_ID"], configuration["BOT_PASSWORD"], httpClientFactory.CreateClient(), logger),
                new AuthenticationConfiguration(), httpClientFactory, logger), logger)
    {
        OnTurnError = async (turnContext, exception) =>
        {
            // Log any leaked exception from the application.
            // NOTE: In production environment, you should consider logging this to
            // Azure Application Insights. Visit https://aka.ms/bottelemetry to see how
            // to add telemetry capture to your bot.
            logger.LogError(exception, $"[OnTurnError] unhandled error : {exception.Message}");

            // Send a message to the user
            await turnContext.SendActivityAsync("The bot encountered an error or bug.");
            await turnContext.SendActivityAsync("To continue to run this bot, please fix the bot source code.");

            // Send a trace activity, which will be displayed in the Bot Framework Emulator
            await turnContext.TraceActivityAsync("OnTurnError Trace", exception.Message, "https://www.botframework.com/schemas/error", "TurnError");
        };
    }
}