using FunctionApp;
using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

[assembly: FunctionsStartup(typeof(Startup))]
namespace FunctionApp
{
    /// <summary>
    /// Runs when the Azure Functions host starts. Microsoft.NET.Sdk.Functions package version 1.0.28 or later
    /// </summary>
    public class Startup : FunctionsStartup
    {
        public override void Configure(IFunctionsHostBuilder builder)
        {
            builder.Services.AddLogging(builder => builder
                .AddConsole()
                .AddFilter(level => level >= LogLevel.Debug)
            );
        }
    }
}