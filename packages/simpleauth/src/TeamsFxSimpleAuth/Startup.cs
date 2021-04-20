// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Microsoft.TeamsFx.SimpleAuth
{
    public class Startup
    {
        readonly string AllowTabApp = "CORS_AllowTabApp";

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Add CORS that allows requests from tab app
            services.AddCors(options =>
               {
                   options.AddPolicy(name: AllowTabApp,
                                     builder =>
                                     {
                                         builder.WithOrigins(Configuration[ConfigurationName.TabAppEndpoint])
                                            .AllowAnyHeader()
                                            .AllowAnyMethod();
                                     });
               });

            services.AddControllers();

            services.AddSwaggerDocument();

            SimpleAuthWebApiExtension.ConfigureTeamsFxSimipleAuth(services, Configuration);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseOpenApi();
            app.UseSwaggerUi3();
            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseCors(AllowTabApp);

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
