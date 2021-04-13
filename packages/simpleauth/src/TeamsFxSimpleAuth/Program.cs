using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.AzureAppServices;

namespace Microsoft.TeamsFx.SimpleAuth
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureLogging(logging => logging.AddAzureWebAppDiagnostics())
                .ConfigureServices(serviceCollection =>
                    serviceCollection.Configure<AzureFileLoggerOptions>(
                        options =>
                        {
                            options.FileName = "azure-diagnostics-";
                            options.RetainedFileCountLimit = 5;
                        })
                    .Configure<AzureBlobLoggerOptions>(options =>
                    {
                        options.BlobName = "log.txt";
                    }))
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
