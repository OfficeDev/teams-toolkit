// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Azure.WebJobs.Description;
using Microsoft.Azure.WebJobs.Host.Config;
using Microsoft.Azure.WebJobs.Logging;
using Microsoft.Extensions.Logging;
using System;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    [Extension("TeamsFx")]
    public class TeamsFxBindingExtensionProvider : IExtensionConfigProvider
    {
        private readonly ILogger _logger;
        private readonly ILoggerFactory _loggerFactory;
        private readonly TeamsFxBindingProvider _bindingProvider;

        public TeamsFxBindingExtensionProvider(ILoggerFactory loggerFactory)
        {
            _loggerFactory = loggerFactory;
            _logger = _loggerFactory.CreateLogger(LogCategories.CreateTriggerCategory("TeamsFx"));

            _bindingProvider = new TeamsFxBindingProvider(_logger);
        }
        public void Initialize(ExtensionConfigContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException(nameof(context));
            }

            context.AddBindingRule<TeamsFxAttribute>().Bind(_bindingProvider);

            _logger.LogDebug("TeamsFx binding initialized");
        }
    }
}
