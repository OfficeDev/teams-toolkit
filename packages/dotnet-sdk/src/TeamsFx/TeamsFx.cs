﻿// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

#nullable enable
using Azure.Core;
using Microsoft.Graph;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Model;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx
{
    public class TeamsFx : JsInteropBase, IAsyncDisposable
    {
        private readonly LogFunctionCallback logFunctionCallback = new();
        private readonly DotNetObjectReference<LogFunctionCallback> logFunctionCallbackRef;

        public TeamsFx(IJSRuntime jsRuntime) : base(jsRuntime)
        {
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
        public async Task LoadConfigurationAsync(Configuration configuration)
        {
            try
            {
                var module = await moduleTask.Value.ConfigureAwait(false);
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
            var module = await moduleTask.Value.ConfigureAwait(false);
            await module.InvokeVoidAsync("setLogLevel", logLevel).ConfigureAwait(false);
        }

        /// <summary>
        /// Get log level.
        /// </summary>
        /// <returns>Log level</returns>
        public async Task<LogLevel> GetLogLevelAsync()
        {
            var module = await moduleTask.Value.ConfigureAwait(false);
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
            var module = await moduleTask.Value.ConfigureAwait(false);
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
        public async Task<Dictionary<string, object>> GetResourceConfigurationAsync(ResourceType resourceType, string? resourceName = "default")
        {
            try
            {
                var module = await moduleTask.Value.ConfigureAwait(false);
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
                var module = await moduleTask.Value.ConfigureAwait(false);
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
        /// <returns>Graph client with specified scopes.</returns>
        public static GraphServiceClient CreateMicrosoftGraphClient(TokenCredential credential, string scopes = ".default")
        {
            var authProvider = new MsGraphAuthProvider(credential, scopes);
            var client = new GraphServiceClient(authProvider);
            return client;
        }

        /// <summary>
        /// Get Microsoft graph client.
        /// </summary>
        /// <param name="credential">Token credential instance.</param>
        /// <param name="scopes">The array of Microsoft Token scopes of access. Default value is `[.default]`.</param>
        /// <returns>Graph client with specified scopes.</returns>
        public static GraphServiceClient CreateMicrosoftGraphClient(TokenCredential credential, string[] scopes)
        {
            var authProvider = new MsGraphAuthProvider(credential, scopes);
            var client = new GraphServiceClient(authProvider);
            return client;
        }

        public async new ValueTask DisposeAsync()
        {
            await base.DisposeAsync().ConfigureAwait(false);
            logFunctionCallbackRef?.Dispose();
        }
    }
}
