using Microsoft.Azure.WebJobs.Host.Bindings;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;
using System.Threading.Tasks;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    public class TeamsFxValueProvider : IValueProvider
    {
        private string configStr;
        private readonly ILogger _logger;

        Type IValueProvider.Type
        {
            get
            {
                 return typeof(string);
            }
        }

        public TeamsFxValueProvider(TeamsFxContext config, ILogger logger)
        {
            _logger = logger;

            try
            {
                configStr = JsonConvert.SerializeObject(config);
            }
            catch (Exception ex)
            {
                var message = "Fail to serialize config object." + ex.Message;
                _logger.LogError(message);
                throw new Exception(message);
            }
        }

        Task<object> IValueProvider.GetValueAsync()
        {
            return Task.FromResult<object>(configStr);
        }

        string IValueProvider.ToInvokeString()
        {
            return configStr;
        }
    }
}
