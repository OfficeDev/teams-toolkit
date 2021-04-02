using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Identity.Client;
using Microsoft.TeamsFxSimpleAuth.Components.Auth;
using Microsoft.TeamsFxSimpleAuth.Components.Auth.Models;
using System;
using System.Linq;

namespace Microsoft.TeamsFxSimpleAuth
{
    public class Startup
    {
        readonly string AllowAllOrigins = "CORS_AllowAllOrigins"; // TODO: Need to config CORS in the future

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Add CORS that allows requests from all hosts
            // TODO: Only allow requests from Teams app, requires support from frontend hosting component
            services.AddCors(options =>
               {
                   options.AddPolicy(name: AllowAllOrigins,
                                     builder =>
                                     {
                                         builder.WithOrigins("*")
                                         .AllowAnyHeader() // TODO: Need to config CORS in the future
                                         .AllowAnyMethod(); // TODO: Need to config CORS in the future
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

            app.UseCors(AllowAllOrigins);

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseStaticFiles();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
