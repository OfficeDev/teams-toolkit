using {{SafeProjectName}};
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Bot.Connector.Authentication;
using Microsoft.TeamsAI;
using Microsoft.TeamsAI.AI;
using Microsoft.TeamsAI.AI.Planner;
using Microsoft.TeamsAI.AI.Prompt;
using Microsoft.TeamsAI.State;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHttpClient("WebClient", client => client.Timeout = TimeSpan.FromSeconds(600));
builder.Services.AddHttpContextAccessor();
builder.Logging.AddConsole();

// Create the Bot Framework Authentication to be used with the Bot Adapter.
var config = builder.Configuration.Get<ConfigOptions>();
builder.Configuration["MicrosoftAppType"] = "MultiTenant";
builder.Configuration["MicrosoftAppId"] = config.BOT_ID;
builder.Configuration["MicrosoftAppPassword"] = config.BOT_PASSWORD;
builder.Services.AddSingleton<BotFrameworkAuthentication, ConfigurationBotFrameworkAuthentication>();

// Create the Bot Framework Adapter with error handling enabled.
builder.Services.AddSingleton<CloudAdapter, AdapterWithErrorHandler>();
builder.Services.AddSingleton<IBotFrameworkHttpAdapter>(sp => sp.GetService<CloudAdapter>()!);

// Create singleton instances for bot application
builder.Services.AddSingleton<IStorage, MemoryStorage>();

#region Use OpenAI
// Use OpenAI
if (config.OpenAI == null || string.IsNullOrEmpty(config.OpenAI.ApiKey))
{
    throw new Exception("Missing OpenAI configuration.");
}
builder.Services.AddSingleton<OpenAIPlannerOptions>(_ => new(config.OpenAI.ApiKey, "gpt-3.5-turbo") { LogRequests = true });

// Create the Application.
builder.Services.AddTransient<IBot, AIBotApplication>(sp =>
{
    // Create loggers
    ILoggerFactory loggerFactory = sp.GetService<ILoggerFactory>()!;

    IPromptManager<TurnState> promptManager = new PromptManager<TurnState>("./Prompts");

    IPlanner<TurnState> planner = new OpenAIPlanner<TurnState>(sp.GetService<OpenAIPlannerOptions>()!, loggerFactory.CreateLogger<OpenAIPlanner<TurnState>>());

    ApplicationOptions<TurnState, TurnStateManager> applicationOptions = new()
    {
        AI = new AIOptions<TurnState>(planner, promptManager)
        {
            Prompt = "Chat",
            History = new AIHistoryOptions()
            {
                AssistantHistoryType = AssistantHistoryType.Text
            }
        },
        Storage = sp.GetService<IStorage>()
    };

    return new AIBotApplication(applicationOptions);
});
#endregion

#region Use Azure OpenAI
/*
if (config.Azure == null
    || string.IsNullOrEmpty(config.Azure.OpenAIApiKey) 
    || string.IsNullOrEmpty(config.Azure.OpenAIEndpoint))
{
    throw new Exception("Missing Azure configuration.");
}

builder.Services.AddSingleton<AzureOpenAIPlannerOptions>(_ => new AzureOpenAIPlannerOptions(config.Azure.OpenAIApiKey, "gpt-35-turbo", config.Azure.OpenAIEndpoint));

// Create the Application.
builder.Services.AddTransient<IBot, AIBotApplication>(sp =>
{
    ILoggerFactory loggerFactory = sp.GetService<ILoggerFactory>()!;

    IPromptManager<TurnState> promptManager = new PromptManager<TurnState>("./Prompts");

    IPlanner<TurnState> planner = new AzureOpenAIPlanner<TurnState>(sp.GetService<AzureOpenAIPlannerOptions>(), loggerFactory.CreateLogger<AzureOpenAIPlanner<TurnState>>());

    ApplicationOptions<TurnState, TurnStateManager> applicationOptions = new ApplicationOptions<TurnState, TurnStateManager>()
    {
        AI = new AIOptions<TurnState>(planner, promptManager)
        {
            Prompt = "Chat",
            History = new AIHistoryOptions()
            {
                AssistantHistoryType = AssistantHistoryType.Text
            }
        },
        Storage = sp.GetService<IStorage>()
    };

    return new AIBotApplication(applicationOptions);
});
*/
#endregion

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