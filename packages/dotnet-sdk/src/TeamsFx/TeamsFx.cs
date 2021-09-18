// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Model;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LogLevel = Microsoft.TeamsFx.Model.LogLevel;

namespace Microsoft.TeamsFx
{
    /// <summary>
    /// Top Level API in TeamsFx SDK.
    /// </summary>
    public class TeamsFx : IAsyncDisposable
    {
        private readonly JsInteropBase jsInteropBase;
        private readonly ILogger<TeamsFx> _logger;
        private readonly ILogger<MsGraphAuthProvider> _authLogger;
        private readonly LogFunctionCallback logFunctionCallback = new();
        private readonly DotNetObjectReference<LogFunctionCallback> logFunctionCallbackRef;

        /// <summary>
        /// The constructor of TeamsFx.
        /// </summary>
        public TeamsFx(IJSRuntime jsRuntime, ILogger<TeamsFx> logger, ILogger<MsGraphAuthProvider> authLogger)
        {
            jsInteropBase = new JsInteropBase(jsRuntime);
            _logger = logger;
            _authLogger = authLogger;
            logFunctionCallbackRef = DotNetObjectReference.Create(logFunctionCallback);
        }

        /// <summary>
        /// Initialize configuration from environment variables or configuration object and set the global instance.
        /// <example>
        /// For example:
        /// <code>
        /// AuthenticationConfiguration authentication = new AuthenticationConfiguration(clientId: _clientId, simpleAuthEndpoint: _endpoint, initiateLoginEndpoint: _endpoint + "auth-start.html");
        /// Configuration configuration = new Configuration(authentication);
        /// await teamsfx.LoadConfigurationAsync(configuration);
        /// </code>
        /// </example>
        /// </summary>
        /// <param name="configuration">Optional configuration that overrides the default configuration values. The override depth is 1.</param>
        /// <returns></returns>
        public async Task LoadConfigurationAsync(Model.Configuration configuration)
        {
            try
            {
                var module = await jsInteropBase.moduleTask.Value.ConfigureAwait(false);
                await module.InvokeVoidAsync("loadConfiguration", configuration).ConfigureAwait(false);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Update log level helper.
        /// </summary>
        /// <param name="logLevel">log level in configuration</param>
        public async Task SetLogLevelAsync(LogLevel logLevel)
        {
            var module = await jsInteropBase.moduleTask.Value.ConfigureAwait(false);
            await module.InvokeVoidAsync("setLogLevel", logLevel).ConfigureAwait(false);
        }

        /// <summary>
        /// Get log level.
        /// </summary>
        /// <returns>Log level</returns>
        public async Task<LogLevel> GetLogLevelAsync()
        {
            var module = await jsInteropBase.moduleTask.Value.ConfigureAwait(false);
            var logLevel = await module.InvokeAsync<LogLevel>("getLogLevel").ConfigureAwait(false);
            return logLevel;
        }

        /// <summary>
        /// Set custom log function to redirect logging output.
        /// <example>
        /// For example: Redirect the log messages to custom outputs like server console using SetLogLevelAsync. The messages can be found in Output panel from "{AppName} - ASP.NET Core Web Server".
        /// <code>
        /// private void log(LogLevel level, string message)
        /// {
        ///    Console.WriteLine(message);
        /// }
        /// await teamsfx.SetLogFunctionAsync(log);
        /// </code>
        /// </example>
        /// </summary>
        /// <param name="logFunction">Custom log function. If it's null, custom log function will be cleared.</param>
        public async Task SetLogFunctionAsync(LogFunction logFunction)
        {
            logFunctionCallback.CustomLogFunction = logFunction;
            var module = await jsInteropBase.moduleTask.Value.ConfigureAwait(false);
            if (logFunction == null)
            {
                await module.InvokeVoidAsync("clearLogFunctionCallback").ConfigureAwait(false);
            }
            else
            {
                await module.InvokeVoidAsync("setLogFunctionCallback", logFunctionCallbackRef).ConfigureAwait(false);
            }
        }

        /// <summary>
        /// Get configuration for a specific resource.
        /// </summary>
        /// <param name="resourceType">The type of resource</param>
        /// <param name="resourceName">The name of resource, default value is "default".</param>
        /// <returns>Resource configuration for target resource from global configuration instance.</returns>
        /// <exception cref="ExceptionCode.InvalidConfiguration">When resource configuration with the specific type and name is not found.</exception>
        public async Task<Dictionary<string, object>> GetResourceConfigurationAsync(ResourceType resourceType, string resourceName = "default")
        {
            try
            {
                var module = await jsInteropBase.moduleTask.Value.ConfigureAwait(false);
                return await module.InvokeAsync<Dictionary<string, object>>("getResourceConfiguration", resourceType, resourceName).ConfigureAwait(false);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Get configuration for authentication.
        /// </summary>
        /// <returns>Authentication configuration from global configuration instance, the value may be undefined if no authentication config exists in current environment.</returns>
        /// <exception cref="ExceptionCode.InvalidConfiguration">When global configuration does not exist.</exception>
        public async Task<AuthenticationConfiguration> GetAuthenticationConfigurationAsync()
        {
            try
            {
                var module = await jsInteropBase.moduleTask.Value.ConfigureAwait(false);
                return await module.InvokeAsync<AuthenticationConfiguration>("getAuthenticationConfiguration").ConfigureAwait(false);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Get Microsoft graph client.
        /// </summary>
        /// <param name="credential">Token credential instance.</param>
        /// <param name="scopes">The string of Microsoft Token scopes of access separated by space. Default value is `.default`.</param>
        /// <param name="logger">Logger of MsGraphAuthProvider class. If the value is null, it will use the logger constructed by DI during TeamsFx class initialization.</param>
        /// <returns>Graph client with specified scopes.</returns>
        public GraphServiceClient CreateMicrosoftGraphClient(TokenCredential credential, string scopes = ".default", ILogger<MsGraphAuthProvider> logger = null)
        {
            logger ??= _authLogger;
            var authProvider = new MsGraphAuthProvider(credential, scopes, logger);
            var client = new GraphServiceClient(authProvider);
            return client;
        }

        /// <summary>
        /// Get Microsoft graph client.
        /// </summary>
        /// <param name="credential">Token credential instance.</param>
        /// <param name="scopes">The array of Microsoft Token scopes of access. Default value is `[.default]`.</param>
        /// <param name="logger">Logger of MsGraphAuthProvider class. If the value is null, it will use the logger constructed by DI during TeamsFx class initialization.</param>
        /// <returns>Graph client with specified scopes.</returns>
        public GraphServiceClient CreateMicrosoftGraphClient(TokenCredential credential, string[] scopes, ILogger<MsGraphAuthProvider> logger = null)
        {
            logger ??= _authLogger;
            var authProvider = new MsGraphAuthProvider(credential, scopes, logger);
            var client = new GraphServiceClient(authProvider);
            return client;
        }

        public async ValueTask DisposeAsync()
        {
            await jsInteropBase.DisposeAsync().ConfigureAwait(false);
            logFunctionCallbackRef?.Dispose();
        }
    }
}
