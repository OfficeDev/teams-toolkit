using agent_test_1;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using {{SafeProjectName}};

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration((hostContext, builder) =>
    {
        var context = hostContext.HostingEnvironment;
        builder
            .AddJsonFile(Path.Combine(context.ContentRootPath, "appsettings.json"), optional: true, reloadOnChange: false)
            .AddJsonFile(Path.Combine(context.ContentRootPath, $"appsettings.{context.EnvironmentName}.json"), optional: true, reloadOnChange: false);
    })
    .ConfigureServices((hostContext, services) =>
    {
        var configuration = hostContext.Configuration;

        var configOptions = configuration.Get<ConfigOptions>();

        services.AddSingleton(hostContext.HostingEnvironment.ContentRootPath);
        services.AddSingleton<TokenValidator>(provider =>
        {
            return new TokenValidator(configuration["tenantId"], CloudType.Public);
        });
        services.AddSingleton<AuthMiddleware>(provider =>
        {
            var tokenValidator = provider.GetRequiredService<TokenValidator>();
            var audience = configuration["clientId"];
            var issuer = $"https://login.microsoftonline.com/{configuration["tenantId"]}/v2.0";
            var allowedTenants = new[] { configuration["tenantId"] };
            var scopes = new[] { "repairs_read" };
            return new AuthMiddleware(tokenValidator, audience, issuer, allowedTenants, scopes);
        });
    })
    .Build();

host.Run();