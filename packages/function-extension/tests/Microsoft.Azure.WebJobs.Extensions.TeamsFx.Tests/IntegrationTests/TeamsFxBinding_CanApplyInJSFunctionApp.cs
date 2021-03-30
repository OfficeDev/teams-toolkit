using Microsoft.Azure.WebJobs.Extensions.TeamsFx.Tests.Helper;
using Microsoft.Azure.WebJobs.Extensions.TeamsFx.Tests.Models;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx.Tests.IntegrationTests
{
    [TestFixture]
    class TeamsFxBinding_CanApplyInJSFunctionApp
    {
        private IConfiguration _configuration;
        private IntegrationTestSettings _integrationTestings;
        private string _defaultAccessToken;

        [OneTimeSetUp]
        public async Task SetUp()
        {
            // Load config
            _configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.IntegrationTests.json")
                .AddEnvironmentVariables(prefix: "TeamsFx_BINDING_")
                .Build();
            _integrationTestings = new IntegrationTestSettings();
            _configuration.GetSection("IntegrationTestSettings").Bind(_integrationTestings);

            try
            {
                _defaultAccessToken = await Utilities.GetApplicationAccessTokenAsync(_integrationTestings.ClientId, _integrationTestings.ClientSecret, _integrationTestings.OAuthAuthority);
            }
            catch (Exception ex)
            {
                throw new Exception("Fail to get default access token: ", ex);
            }
        }

        #region Utility
        private async Task<HttpResponseMessage> invokeFunctionHostTriggerWithTokenAsync(string testFunctionPort, string accessToken)
        {
            HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*"));
            var response = await client.GetAsync("http://localhost:" + testFunctionPort + "/api/httpTrigger");

            var responseBody = await response.Content.ReadAsStringAsync();
            TestContext.WriteLine("responseBody: " + responseBody);

            return response;
        }
        #endregion

        [Test]
        public async Task Authorization_WithTokenOfClientIdInRequest_Return200WithTeamsFxConfig()
        {
            // Arrange
            HttpResponseMessage response = await invokeFunctionHostTriggerWithTokenAsync(_integrationTestings.MainTestFunctionPort, _defaultAccessToken);

            // Action
            var responseBody = await response.Content.ReadAsStringAsync();

            // Assert
            var responseObject = JsonConvert.DeserializeObject<Dictionary<string, string>>(responseBody);
            Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
            Assert.AreEqual("Bearer " + _defaultAccessToken, responseObject["AccessToken"]);
            Assert.AreEqual(_integrationTestings.ClientId, responseObject["ClientId"]);
            Assert.AreEqual(_integrationTestings.ClientSecret, responseObject["ClientSecret"]);
            Assert.AreEqual(_integrationTestings.OAuthAuthority, responseObject["OAuthAuthority"]);
            Assert.AreEqual("MockFunctionEndpointValue", responseObject["FunctionEndpoint"]);
            Assert.AreEqual("MockSqlEndpointValue", responseObject["SqlEndpoint"]);
            Assert.AreEqual("MockDatabaseNameValue", responseObject["Database"]);
            Assert.AreEqual("MockIdentityIdValue", responseObject["IdentityId"]);
        }

        [Test]
        public async Task Authorization_WithTokenOfAllowedAppIdsInRequest_Return200WithCorrectAccessToken()
        {
            // Arrange
            string accessTokenOfAllowedApp = await Utilities.GetApplicationAccessTokenAsync(_integrationTestings.AllowedAppClientId, _integrationTestings.AllowedAppClientSecret, _integrationTestings.OAuthAuthority);

            // Action
            HttpResponseMessage response = await invokeFunctionHostTriggerWithTokenAsync(_integrationTestings.MainTestFunctionPort, accessTokenOfAllowedApp);

            // Assert
            var responseBody = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeObject<Dictionary<string, string>>(responseBody);
            Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
            Assert.AreEqual("Bearer " + accessTokenOfAllowedApp, responseObject["AccessToken"]);
        }

        [Test]
        public async Task Authorization_WithTokenOfUnauthorizedAppIdsInRequest_Return403()
        {
            // Arrange
            string accessTokenOfUnauthorizedApp = await Utilities.GetApplicationAccessTokenAsync(_integrationTestings.UnauthorizedAadAppClientId, _integrationTestings.UnauthorizedAadAppClientSecret, _integrationTestings.OAuthAuthority);

            // Action
            HttpResponseMessage response = await invokeFunctionHostTriggerWithTokenAsync(_integrationTestings.MainTestFunctionPort, accessTokenOfUnauthorizedApp);

            // Assert
            var expectedBody = $"Access token validation failed: client id {_integrationTestings.UnauthorizedAadAppClientId} is not authorized to invoke this http trigger.";
            var responseBody = await response.Content.ReadAsStringAsync();
            Assert.AreEqual(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.AreEqual(new MediaTypeHeaderValue("text/plain") { CharSet = "utf-8" }, response.Content.Headers.ContentType);
            Assert.AreEqual(expectedBody.Length, response.Content.Headers.ContentLength);
            Assert.AreEqual(expectedBody, responseBody);
        }

        [Test]
        public async Task ReadEnvVar_WithEmptyClientId_Return403()
        {
            // Action
            HttpResponseMessage response = await invokeFunctionHostTriggerWithTokenAsync(_integrationTestings.EmptyClientIdTestFunctionPort, _defaultAccessToken);

            // Assert
            var expectedBody = $"Access token validation failed: client id {_integrationTestings.ClientId} is not authorized to invoke this http trigger.";
            var responseBody = await response.Content.ReadAsStringAsync();
            Assert.AreEqual(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.AreEqual(new MediaTypeHeaderValue("text/plain") { CharSet = "utf-8" }, response.Content.Headers.ContentType);
            Assert.AreEqual(expectedBody.Length, response.Content.Headers.ContentLength);
            Assert.AreEqual(expectedBody, responseBody);
        }

        [Test]
        public async Task ReadEnvVar_WithEmptyStringProperties_Return200WithNullProperties()
        {
            // Action
            HttpResponseMessage response = await invokeFunctionHostTriggerWithTokenAsync(_integrationTestings.EmptyStringPropertiesTestFunctionPort, _defaultAccessToken);

            // Assert
            var responseBody = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeObject<Dictionary<string, string>>(responseBody);
            Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
            Assert.AreEqual("Bearer " + _defaultAccessToken, responseObject["AccessToken"]);
            Assert.AreEqual(_integrationTestings.ClientId, responseObject["ClientId"]);
            Assert.AreEqual(null, responseObject["ClientSecret"]);
            Assert.AreEqual(_integrationTestings.OAuthAuthority, responseObject["OAuthAuthority"]);
            Assert.AreEqual(null, responseObject["FunctionEndpoint"]);
            Assert.AreEqual(null, responseObject["SqlEndpoint"]);
            Assert.AreEqual(null, responseObject["Database"]);
            Assert.AreEqual(null, responseObject["IdentityId"]);
        }

        [Test]
        public async Task ReadEnvVar_WithNullClientId_Return403()
        {
            // Action
            HttpResponseMessage response = await invokeFunctionHostTriggerWithTokenAsync(_integrationTestings.NullClientIdTestFunctionPort, _defaultAccessToken);

            // Assert
            var expectedBody = $"Access token validation failed: client id {_integrationTestings.ClientId} is not authorized to invoke this http trigger.";
            var responseBody = await response.Content.ReadAsStringAsync();
            Assert.AreEqual(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.AreEqual(new MediaTypeHeaderValue("text/plain") { CharSet = "utf-8" }, response.Content.Headers.ContentType);
            Assert.AreEqual(expectedBody.Length, response.Content.Headers.ContentLength);
            Assert.AreEqual(expectedBody, responseBody);
        }

        [Test]
        public async Task ReadEnvVar_WithNullProperties_Return200WithNullProperties()
        {
            // Action
            HttpResponseMessage response = await invokeFunctionHostTriggerWithTokenAsync(_integrationTestings.NullPropertiesTestFunctionPort, _defaultAccessToken);

            // Assert
            var responseBody = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeObject<Dictionary<string, string>>(responseBody);
            Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
            Assert.AreEqual("Bearer " + _defaultAccessToken, responseObject["AccessToken"]);
            Assert.AreEqual(_integrationTestings.ClientId, responseObject["ClientId"]);
            Assert.AreEqual(null, responseObject["ClientSecret"]);
            Assert.AreEqual(_integrationTestings.OAuthAuthority, responseObject["OAuthAuthority"]);
            Assert.AreEqual(null, responseObject["FunctionEndpoint"]);
            Assert.AreEqual(null, responseObject["SqlEndpoint"]);
            Assert.AreEqual(null, responseObject["Database"]);
            Assert.AreEqual(null, responseObject["IdentityId"]);
        }
    }
}
