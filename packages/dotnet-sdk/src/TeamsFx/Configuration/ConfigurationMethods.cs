// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Extensions.Configuration;
using Microsoft.TeamsFx;
using Microsoft.TeamsFx.Configuration;

namespace Microsoft.Extensions.DependencyInjection
{
    /// <summary>
    /// Service Registration
    /// </summary>
    public static class TeamsFxConfigurationMethods
    {
        /// <summary>
        /// Adding TeamsFx related classes and options.
        /// </summary>
        /// <param name="services">service collection for DI</param>
        /// <param name="config">configuration instance</param>
        /// <returns></returns>
        public static IServiceCollection AddTeamsFx(this IServiceCollection services, IConfiguration config)
        {
            services.AddOptions();
            services.AddScoped<TeamsFx.TeamsFx>();
            services.AddScoped<TeamsUserCredential>();

            services.Configure<AuthenticationOptions>(config.GetSection(AuthenticationOptions.Authentication));

            return services;
        }
    }
}
