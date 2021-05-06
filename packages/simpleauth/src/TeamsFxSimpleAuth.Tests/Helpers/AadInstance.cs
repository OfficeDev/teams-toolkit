// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using IdentityModel;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Graph;
using Microsoft.Graph.Auth;
using Microsoft.Identity.Client;
using Microsoft.TeamsFx.SimpleAuth.Tests.Models;

namespace Microsoft.TeamsFx.SimpleAuth.Tests.Helpers
{
    public class AadInstance<TStartup> where TStartup : class
    {
        public IConfiguration Configuration { get; private set; }
        public IntegrationTestSettings IntegrationTestSettings { get; private set; }
        public AadInfo TeamsAadInfo { get; private set; }

        private GraphServiceClient _graphClient;

        private const string ShortTokenLifetimePolicyName = "Test-SimpleAuth-ShortTokenLifetime";

        // TODO: Initialze only once for all testfixtures
        // TODO: Make common property public
        public async Task InitializeAsync()
        {
            // Set up aad app for this test
            try
            {
                // Load config
                Configuration = new ConfigurationBuilder()
                    .SetBasePath(System.IO.Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.IntegrationTests.json")
                    .AddEnvironmentVariables(prefix: "TEAMS_SIMPLE_AUTH_")
                    .Build();
                IntegrationTestSettings = new IntegrationTestSettings();
                Configuration.GetSection("IntegrationTestSettings").Bind(IntegrationTestSettings);

                var confidentialClientApplication = ConfidentialClientApplicationBuilder
                    .Create(IntegrationTestSettings.AdminClientId)
                    .WithTenantId(IntegrationTestSettings.TenantId)
                    .WithClientSecret(IntegrationTestSettings.AdminClientSecret)
                    .Build();

                var authProvider = new ClientCredentialProvider(confidentialClientApplication);
                _graphClient = new GraphServiceClient(authProvider);

                // Create aad apps
                TeamsAadInfo = await CreateTeamsAadAppAsync();

                // Make token for the aad app expire after 10 minutes
                var policyId = await GetOrCreateShortTokenLifetimePolicy();
                await ApplyPolicyToAadApp(policyId, TeamsAadInfo.Id);

                using (var sha256 = SHA256.Create())
                {
                    var challengeBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(IntegrationTestSettings.CodeVerifier));
                    IntegrationTestSettings.CodeChallenge = Base64Url.Encode(challengeBytes);
                }

                Utilities.ConsentAndGetAuthorizationCode(IntegrationTestSettings.AuthorizeUrl, TeamsAadInfo.AppId,
                    IntegrationTestSettings.RedirectUri, "https://graph.microsoft.com/User.Read", IntegrationTestSettings.CodeChallenge,
                    IntegrationTestSettings.TestUsername, IntegrationTestSettings.TestPassword); // Just consent the default permission
                Utilities.ConsentAndGetAuthorizationCode(IntegrationTestSettings.AuthorizeUrl, TeamsAadInfo.AppId,
                    IntegrationTestSettings.RedirectUri, "https://graph.microsoft.com/User.Read", IntegrationTestSettings.CodeChallenge,
                    IntegrationTestSettings.TestUsername2, IntegrationTestSettings.TestPassword2); // Just consent the default permission
                // Use User.Read scope instead of .default scope to avoid intermittent error caused by AAD permission list sync issue
            }
            catch (Exception ex)
            {
                new Exception("Failed to create aad app for this test.", ex);
            }
        }

        public WebApplicationFactory<TStartup> ConfigureWebApplicationFactory(Dictionary<string, string> configurations)
        {
            return new WebApplicationFactory<TStartup>().WithWebHostBuilder(builder =>
                {
                    builder.UseContentRoot(NUnit.Framework.TestContext.CurrentContext.TestDirectory);
                    // Overwrite configuration value with test aad app settings
                    builder.ConfigureAppConfiguration((context, configureBuilder) =>
                    {
                        configureBuilder.AddInMemoryCollection(configurations);
                    });
                });
        }

        public async Task DisposeAsync()
        {
            await _graphClient.Applications[TeamsAadInfo.Id]
                .Request()
                .DeleteAsync();
        }

        private async Task ApplyPolicyToAadApp(string policyId, string appObjectId)
        {
            var tokenLifetimePolicy = new TokenLifetimePolicy()
            {
                Id = policyId,
                AdditionalData = new Dictionary<string, object>()
                {
                    {"@odata.id", "https://graph.microsoft.com/v1.0/policies/tokenLifetimePolicies/"+policyId}
                }
            };
            await _graphClient.Applications[appObjectId].TokenLifetimePolicies.References.Request().AddAsync(tokenLifetimePolicy);
        }

        private async Task<string> GetOrCreateShortTokenLifetimePolicy()
        {
            var tokenLifetimePolicies = await _graphClient.Policies.TokenLifetimePolicies.Request().GetAsync();
            var policyId = string.Empty;
            while (tokenLifetimePolicies.Count > 0)
            {
                var result = tokenLifetimePolicies.FirstOrDefault(x => x.DisplayName == ShortTokenLifetimePolicyName);
                if (result != null)
                {
                    policyId = result.Id;
                    break;
                }
                else if (tokenLifetimePolicies.NextPageRequest != null)
                {
                    tokenLifetimePolicies = await tokenLifetimePolicies.NextPageRequest.GetAsync();
                }
                else
                {
                    break;
                }
            }
            if (string.IsNullOrEmpty(policyId))
            {
                policyId = await CreateShortTokenLifetimePolicy();
            }
            return policyId;
        }

        private async Task<string> CreateShortTokenLifetimePolicy()
        {
            var tokenLifetimePolicy = new TokenLifetimePolicy
            {
                DisplayName = ShortTokenLifetimePolicyName,
                Definition = new List<string>()
                {
                    "{\"TokenLifetimePolicy\":{\"Version\":1,\"AccessTokenLifetime\":\"00:10:00\"}}"  // Access token will expire after 10 minutes
                }
            };
            var result = await _graphClient.Policies.TokenLifetimePolicies.Request().AddAsync(tokenLifetimePolicy);
            return result.Id;
        }

        private async Task<AadInfo> CreateTeamsAadAppAsync()
        {
            var aadName = "teamsfx-integration-test-teamsfx-app-" + Guid.NewGuid().ToString();
            var app = await Utilities.CreateAad(aadName, _graphClient, IntegrationTestSettings);

            Configuration[ConfigurationName.ClientId] = app.AppId;
            Configuration[ConfigurationName.ClientSecret] = app.ClientSecret;

            // Update AAD app
            var application = new Application
            {
                SignInAudience = "AzureADMyOrg",
                Web = new WebApplication
                {
                    RedirectUris = new List<string>() { IntegrationTestSettings.RedirectUri }
                },
                IdentifierUris = new List<string>() { app.IdentifierUri },
                Api = new ApiApplication
                {
                    Oauth2PermissionScopes = new List<PermissionScope>()
                    {
                        new PermissionScope
                        {
                            Id = Guid.NewGuid(),
                            Type = "User",
                            Value = "access_as_user",
                            AdminConsentDisplayName = "Test app can access the user’s profile",
                            AdminConsentDescription = "Allows Test app to call the app’s web APIs as the current user.",
                            IsEnabled = true,
                            UserConsentDescription = "Enable Test app to call this app’s APIs with the same rights that you have",
                            UserConsentDisplayName = "Test app can access your user profile and make requests on your behalf"
                        },

                        new PermissionScope
                        {
                            Id = Guid.NewGuid(),
                            Type = "User",
                            Value = "another_scope",
                            AdminConsentDisplayName = "Another scope for test app",
                            AdminConsentDescription = "Another scope for test app.",
                            IsEnabled = true,
                            UserConsentDescription = "Another scope for test app",
                            UserConsentDisplayName = "Another scope for test app."
                        }
                    }
                },
                OptionalClaims = new OptionalClaims()
                {
                    AccessToken = new List<OptionalClaim>()
                    {
                        new OptionalClaim()
                        {
                            Name = JWTClaims.IdType
                        }
                    }
                },
                RequiredResourceAccess = new List<RequiredResourceAccess>()
                {
                    new RequiredResourceAccess()
                    {
                        ResourceAppId = "00000003-0000-0000-c000-000000000000", // Microsoft Graph
                        ResourceAccess = new List<ResourceAccess>
                        {
                            new ResourceAccess()
                            {
                                Id = new Guid("e1fe6dd8-ba31-4d61-89e7-88639da4683d"), // User.Read
                                Type = "Scope"
                            }
                        }
                    }
                }
            };

            await _graphClient.Applications[app.Id]
            .Request()
            .UpdateAsync(application);
            return app;
        }
    }
}
