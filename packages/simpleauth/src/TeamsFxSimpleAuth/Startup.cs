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

            // Add authentication handler that validates OAuth tokens
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new IdentityModel.Tokens.TokenValidationParameters()
                    {
                        ValidateAudience = true, // only accept token issued to Teams app client id
                        ValidateIssuer = false, // The is no default support for AAD multi tenant validation, need to provide full list of issuers which is not possible
                        ValidAudiences = new string[] { Configuration[ConfigurationName.ClientId], Configuration[ConfigurationName.IdentifierUri] },
                    };
                    
                    options.MetadataAddress = Configuration[ConfigurationName.AadMetadataAddress];
                });

            services.AddAuthorization(options =>
            {
                options.AddPolicy("ValidateTokenVersion", policy => policy.RequireClaim(JWTClaims.Version, new string[] { JWTVersion.Ver1, JWTVersion.Ver2 }));

                options.AddPolicy("ValidateAppId", policy =>
                {
                    // TODO: Read allowed App ids from storage or other place
                    var allowedAppIdsFromConfig = Configuration[ConfigurationName.AllowedAppIds]?.Split(";", StringSplitOptions.RemoveEmptyEntries);
                    var allowedAppIds = allowedAppIdsFromConfig.Append(Configuration[ConfigurationName.ClientId]).ToArray();
                    policy.Requirements.Add(new AppIdRequirement(allowedAppIds));
                });

                options.AddPolicy("ValidateUserIdentity", policy =>
                {
                    policy.Requirements.Add(new IdentityRequirement(JWTIdentityType.UserIdentity));
                });
            });

            services.AddControllers()
                .AddNewtonsoftJson(options =>
                options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore
                );
            services.AddSwaggerDocument();

            // DI for IConfidentialClientApplication
            services.AddSingleton(x =>
                 ConfidentialClientApplicationBuilder.Create(Configuration[ConfigurationName.ClientId])
                    .WithClientSecret(Configuration[ConfigurationName.ClientSecret])
                    .WithAuthority(Configuration[ConfigurationName.OAuthTokenEndpoint])
                    .Build());

            // DI for AuthHandler
            services.AddScoped<AuthHandler>();
            services.AddSingleton<IAuthorizationHandler, AppIdAuthorizationHandler>();
            services.AddSingleton<IAuthorizationHandler, IdentityAuthorizationHandler>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseExceptionHandler("/.internal/error-local-development");
            }
            else
            {
                app.UseExceptionHandler("/.internal/error");
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
