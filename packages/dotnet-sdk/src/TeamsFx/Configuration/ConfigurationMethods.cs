// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Extensions.Configuration;
using Microsoft.TeamsFx;
using Microsoft.TeamsFx.Configuration;
using System;

namespace Microsoft.Extensions.DependencyInjection
{
    /// <summary>
    /// Service Registration
    /// </summary>
    public static class TeamsFxConfigurationMethods
    {
        /// <summary>
        /// Add TeamsFx SDK.
        /// </summary>
        /// <param name="services">service collection for DI</param>
        /// <param name="namedConfigurationSection">configuration instance</param>
        /// <returns></returns>
        public static IServiceCollection AddTeamsFx(
            this IServiceCollection services,
            IConfiguration namedConfigurationSection)
        {
            services.AddHttpClient();
            services.AddOptions();
            services.AddScoped<TeamsFx.TeamsFx>();
            services.AddScoped<TeamsUserCredential>();

            services.AddOptions<AuthenticationOptions>().Bind(namedConfigurationSection.GetSection(AuthenticationOptions.Authentication)).ValidateDataAnnotations();

            return services;
        }

        /// <summary>
        /// Add TeamsFx SDK.
        /// </summary>
        /// <param name="services">service collection for DI</param>
        /// <param name="configureOptions">customized action to configure option</param>
        /// <returns></returns>
        public static IServiceCollection AddTeamsFx(
            this IServiceCollection services,
            Action<AuthenticationOptions> configureOptions)
        {
            services.AddHttpClient();
            services.AddOptions();
            services.AddScoped<TeamsFx.TeamsFx>();
            services.AddScoped<TeamsUserCredential>();

            services.Configure(configureOptions);
            services.AddOptions<AuthenticationOptions>()
                .Configure(configureOptions).ValidateDataAnnotations();

            return services;
        }

        /// <summary>
        /// Add TeamsFx SDK.
        /// </summary>
        /// <param name="services">service collection for DI</param>
        /// <param name="userOptions">customized option instance</param>
        /// <returns></returns>
        public static IServiceCollection AddTeamsFx(
            this IServiceCollection services,
            AuthenticationOptions userOptions)
        {
            services.AddHttpClient();
            services.AddOptions();
            services.AddScoped<TeamsFx.TeamsFx>();
            services.AddScoped<TeamsUserCredential>();

            services.AddOptions<AuthenticationOptions>()
                .Configure(options => {
                    options.ClientId = userOptions.ClientId;
                    options.InitiateLoginEndpoint = userOptions.InitiateLoginEndpoint;
                    options.SimpleAuthEndpoint = userOptions.SimpleAuthEndpoint;
                }).ValidateDataAnnotations();

            return services;
        }
    }
}
