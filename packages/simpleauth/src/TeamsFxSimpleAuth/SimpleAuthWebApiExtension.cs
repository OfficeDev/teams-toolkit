using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Identity.Client;
using Microsoft.TeamsFxSimpleAuth.Components.Auth;
using Microsoft.TeamsFxSimpleAuth.Components.Auth.Models;
using Microsoft.TeamsFxSimpleAuth.Controllers;
using System;
using System.Linq;

namespace Microsoft.TeamsFxSimpleAuth
{
    public static class SimpleAuthWebApiExtension
    {
        public static IServiceCollection AddTeamsFxSimpleAuth(
            this IServiceCollection services, IConfiguration configuration,
            Action<JwtBearerOptions> configureJwtBearerOptions = null)
        {
            if (services == null)
            {
                throw new ArgumentNullException(nameof(services));
            }

            // Add auth controller to an existing ASP.NET Core project
            services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);

            ConfigureTeamsFxSimipleAuth(services, configuration, configureJwtBearerOptions);

            return services;
        }

        internal static void ConfigureTeamsFxSimipleAuth(IServiceCollection services, IConfiguration configuration,
            Action<JwtBearerOptions> configureJwtBearerOptions = null)
        {
            // Add authentication
            if (configureJwtBearerOptions == null)
            {
                configureJwtBearerOptions = options =>
                {
                    options.TokenValidationParameters = new IdentityModel.Tokens.TokenValidationParameters()
                    {
                        ValidateAudience = true, // only accept token issued to Teams app client id
                        ValidateIssuer = false, // The is no default support for AAD multi tenant validation, need to provide full list of issuers which is not possible
                        ValidAudiences = new string[] { configuration[ConfigurationName.ClientId], configuration[ConfigurationName.IdentifierUri] },
                    };

                    options.MetadataAddress = configuration[ConfigurationName.AadMetadataAddress];
                };
            }

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(configureJwtBearerOptions);

            services.AddAuthorization(options =>
            {
                options.AddPolicy("ValidateTokenVersion", policy => policy.RequireClaim(JWTClaims.Version, new string[] { JWTVersion.Ver1, JWTVersion.Ver2 }));

                options.AddPolicy("ValidateAppId", policy =>
                {
                    // TODO: Read allowed App ids from storage or other place
                    var allowedAppIdsFromConfig = configuration[ConfigurationName.AllowedAppIds]?.Split(";", StringSplitOptions.RemoveEmptyEntries);
                    var allowedAppIds = allowedAppIdsFromConfig.Append(configuration[ConfigurationName.ClientId]).ToArray();
                    policy.Requirements.Add(new AppIdRequirement(allowedAppIds));
                });

                options.AddPolicy("ValidateUserIdentity", policy =>
                {
                    policy.Requirements.Add(new IdentityRequirement(JWTIdentityType.UserIdentity));
                });
            });

            // DI for IConfidentialClientApplication
            services.AddSingleton(x =>
                 ConfidentialClientApplicationBuilder.Create(configuration[ConfigurationName.ClientId])
                    .WithClientSecret(configuration[ConfigurationName.ClientSecret])
                    .WithAuthority(configuration[ConfigurationName.OAuthTokenEndpoint])
                    .Build());

            // DI for AuthHandler
            services.AddScoped<AuthHandler>();
            services.AddScoped<SimpleAuthExceptionFilter>();
            services.AddSingleton<IAuthorizationHandler, AppIdAuthorizationHandler>();
            services.AddSingleton<IAuthorizationHandler, IdentityAuthorizationHandler>();
        }
    }
}
