// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Graph;
using Microsoft.TeamsFx.SimpleAuth.Tests.Models;
using Newtonsoft.Json;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;

namespace Microsoft.TeamsFx.SimpleAuth.Tests.Helpers
{
    public static class Utilities
    {

        private class AadGrantType
        {
            public const string AuthorizationCode = "authorization_code";
            public const string code = "code";
            public const string ClientCredentials = "client_credentials";
            public const string Password = "password";
        }

        private static IWebElement WaitUntilElementExists(IWebDriver driver, By elementLocator, int timeout = 10)
        {
            try
            {
                var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timeout));
                return wait.Until(SeleniumExtras.WaitHelpers.ExpectedConditions.ElementExists(elementLocator));
            }
            catch (NoSuchElementException)
            {
                Console.WriteLine("Element with locator: '" + elementLocator + "' was not found in current context page.");
                throw;
            }
        }

        // Sometimes clicking elements fails with StaleElementReferenceException because browser has not yet loaded successfully. Retry to avoid this issue.
        private static void ClickElementWithRetry(IWebDriver driver, By elementLocator, int attemptTimes = 5, int timeout = 10)
        {
            while (attemptTimes > 0)
            {
                try
                {
                    var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timeout));
                    wait.Until(SeleniumExtras.WaitHelpers.ExpectedConditions.ElementToBeClickable(elementLocator)).Click();
                    break;
                }
                catch (StaleElementReferenceException)
                {
                }
                catch (NoSuchElementException)
                {
                    Console.WriteLine("Element with locator: '" + elementLocator + "' was not found in current context page.");
                    throw;
                }
                attemptTimes--;
            }
        }

        public static string ConsentAndGetAuthorizationCode(string authorizeUrl, string clientId, string redirectUrl, string scope,
            string codeChallenge, string testAccountUserName, string testAccountPassword)
        {
            var chromeOptions = new ChromeOptions();
            chromeOptions.AddArguments("--no-sandbox", "--headless", "--window-size=1920,1080");
            // Here System.Environment.CurrentDirectory will return the current directory path.
            // This update is for ask Cloudtest to find the correct chromedriver from the built folder 
            // e.g. src/TeamsFxSimpleAuth.Test/bin/Release/netcoreapp3.1/
            ChromeDriver driver = new ChromeDriver(System.Environment.CurrentDirectory, chromeOptions);

            Dictionary<string, string> param = new Dictionary<string, string>()
            {
                ["response_type"] = AadGrantType.code,
                ["client_id"] = clientId,
                ["code_challenge"] = codeChallenge,
                ["code_challenge_method"] = "S256",
                ["state"] = "123456",
                ["scope"] = scope,
                ["redirect_uri"] = redirectUrl
            };
            var requestUri = new Uri(QueryHelpers.AddQueryString(authorizeUrl, param));
            driver.Navigate().GoToUrl(requestUri);

            IWebElement username = WaitUntilElementExists(driver, By.Name("loginfmt"));
            username.SendKeys(testAccountUserName);
            // Click "Next"
            ClickElementWithRetry(driver, By.Id("idSIButton9"));

            IWebElement password = WaitUntilElementExists(driver, By.Name("passwd"), 10);
            password.SendKeys(testAccountPassword);

            // Click "Sign in"
            ClickElementWithRetry(driver, By.Id("idSIButton9"));

            // Click "Accept"
            ClickElementWithRetry(driver, By.Id("idSIButton9"));

            Uri redirectedUrl = new Uri(driver.Url);
            driver.Close();

            string authorizationCode = HttpUtility.ParseQueryString(redirectedUrl.Query).Get("code");

            if (string.IsNullOrEmpty(authorizationCode))
            {
                throw new Exception($"Failed to get authorization code from redirect url: {redirectedUrl.AbsoluteUri}");
            }

            return authorizationCode;
        }

        public static string GetAuthorizationCode(IntegrationTestSettings settings, IConfiguration configuration)
        {
            return ConsentAndGetAuthorizationCode(settings.AuthorizeUrl, configuration[ConfigurationName.ClientId],
                settings.RedirectUri, "openid offline_access", settings.CodeChallenge,
                settings.TestUsername, settings.TestPassword);
        }

        public static async Task<string> GetAccessTokenUsingClientCredentialsFlow(string endpoint, string clientId, string clientSecret, string scope)
        {
            var content = new ClientCredentialRequestBody
            {
                Grant_type = AadGrantType.ClientCredentials,
                Client_id = clientId,
                Client_secret = clientSecret,
                Scope = scope,
            };

            using (var client = new HttpClient(new RetryHandler(new HttpClientHandler())))
            {
                HttpRequestMessage tokenReq = new HttpRequestMessage(HttpMethod.Post, endpoint)
                {
                    Content = ToFormUrlEncodedContent(content)
                };
                HttpResponseMessage response = await client.SendAsync(tokenReq);

                if (response == null || !response.IsSuccessStatusCode)
                {
                    throw new Exception("Get access token failed");
                }

                TokenResponse result = JsonConvert.DeserializeObject<TokenResponse>(await response.Content.ReadAsStringAsync());
                return result.AccessToken;
            }
        }

        public static async Task<string> GetUserAccessToken(string username, string password, string clientId, string clientSecret, string oauthAuthority, string scope)
        {
            var oauthTokenEndpoint = oauthAuthority.TrimEnd('/') + "/oauth2/v2.0/token";
            PasswordCredentialRequestBody content = new PasswordCredentialRequestBody
            {
                Grant_type = AadGrantType.Password,
                Username = username,
                Password = password,
                Client_id = clientId,
                Client_secret = clientSecret,
                Scope = scope
            };
            using (var client = new HttpClient(new RetryHandler(new HttpClientHandler())))
            {
                HttpRequestMessage tokenReq = new HttpRequestMessage(HttpMethod.Post, oauthTokenEndpoint)
                {
                    Content = ToFormUrlEncodedContent(content)
                };
                HttpResponseMessage response = await client.SendAsync(tokenReq);

                if (response == null || !response.IsSuccessStatusCode)
                {
                    throw new Exception("Get user access token failed");
                }

                TokenResponse result = JsonConvert.DeserializeObject<TokenResponse>(await response.Content.ReadAsStringAsync());
                if (string.IsNullOrEmpty(result.AccessToken))
                {
                    throw new Exception("User access token is empty");
                }

                return result.AccessToken;
            }
        }

        public static async Task<AadInfo> CreateAad(string name, GraphServiceClient graphClient, IntegrationTestSettings settings)
        {
            var application = new Application
            {
                DisplayName = name,
            };

            var _app = await graphClient.Applications
                .Request()
                .AddAsync(application);

            // generate client secret
            var passwordCredential = new PasswordCredential
            {
                DisplayName = "test client secret"
            };

            var clientSecret = await graphClient.Applications[_app.Id]
                .AddPassword(passwordCredential)
                .Request()
                .PostAsync();

            var identifierUri = GetIdentifierUri(settings.ApiAppIdUri, _app.AppId);

            return new AadInfo() { Id = _app.Id, AppId = _app.AppId, ClientSecret = clientSecret.SecretText, IdentifierUri = identifierUri };
        }

        public static string GetIdentifierUri(string apiAppIdUri, string appId)
        {
            return $"{apiAppIdUri}/{appId}";
        }

        public static FormUrlEncodedContent ToFormUrlEncodedContent(object content)
        {
            var dictionary = new Dictionary<string, string>();
            foreach (PropertyDescriptor property in TypeDescriptor.GetProperties(content))
            {
                var value = (string)property.GetValue(content);
                if (!string.IsNullOrEmpty(value))
                {
                    dictionary.Add(property.Name, value);
                }
            }
            var formUrlEncodedContent = new FormUrlEncodedContent(dictionary);
            return formUrlEncodedContent;
        }
    }
}
