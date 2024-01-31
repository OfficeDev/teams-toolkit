using {{SafeProjectName}};
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Bot.Connector.Authentication;
using Microsoft.Teams.AI;
using Microsoft.Teams.AI.AI.Planners.Experimental;
using Microsoft.Teams.AI.AI.Planners;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHttpClient("WebClient", client => client.Timeout = TimeSpan.FromSeconds(600));
builder.Services.AddHttpContextAccessor();

// Prepare Configuration for ConfigurationBotFrameworkAuthentication
var config = builder.Configuration.Get<ConfigOptions>();
builder.Configuration["MicrosoftAppType"] = "MultiTenant";
builder.Configuration["MicrosoftAppId"] = config.BOT_ID;
builder.Configuration["MicrosoftAppPassword"] = config.BOT_PASSWORD;

// Create the Bot Framework Authentication to be used with the Bot Adapter.
builder.Services.AddSingleton<BotFrameworkAuthentication, ConfigurationBotFrameworkAuthentication>();

// Create the Cloud Adapter with error handling enabled.
// Note: some classes expect a BotAdapter and some expect a BotFrameworkHttpAdapter, so
// register the same adapter instance for both types.
builder.Services.AddSingleton<CloudAdapter, AdapterWithErrorHandler>();
builder.Services.AddSingleton<IBotFrameworkHttpAdapter>(sp => sp.GetService<CloudAdapter>());
builder.Services.AddSingleton<BotAdapter>(sp => sp.GetService<CloudAdapter>());

builder.Services.AddSingleton<IStorage, MemoryStorage>();

if (string.IsNullOrWhiteSpace(config.OpenAI.ApiKey) || string.IsNullOrWhiteSpace(config.OpenAI.AssistantId))
{
    throw new Exception("Missing configuration OpenAI.ApiKey or OpenAI.AssistantId. See GettingStarted.md to prepare your own OpenAI Assistant.");
}

builder.Services.AddSingleton(_ => new AssistantsPlannerOptions(config.OpenAI.ApiKey, config.OpenAI.AssistantId));

// Create the bot as transient. In this case the ASP Controller is expecting an IBot.
builder.Services.AddTransient<IBot>(sp =>
{
    // Create loggers
    ILoggerFactory loggerFactory = sp.GetService<ILoggerFactory>();

    // Create AssistantsPlanner
    IPlanner<AssistantsState> planner = new AssistantsPlanner<AssistantsState>(sp.GetService<AssistantsPlannerOptions>()!, loggerFactory);

    Application<AssistantsState> app = new ApplicationBuilder<AssistantsState>()
        .WithAIOptions(new(planner))
        .WithStorage(sp.GetService<IStorage>())
        .Build();


    // Register AI actions
    app.AI.ImportActions(new ActionHandlers());

    // Listen for user to say "/reset".
    app.OnMessage("/reset", ActivityHandlers.ResetMessageHandler);

    return app;
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseStaticFiles();
app.UseRouting();
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});

app.Run();