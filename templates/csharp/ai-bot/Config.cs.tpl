namespace {{SafeProjectName}}
{
    public class ConfigOptions
    {
        public string MicrosoftAppType { get; set; }
        public string MicrosoftAppId { get; set; }
        public string MicrosoftAppTenantId { get; set; }
        public string MicrosoftAppPassword { get; set; }
        public OpenAIConfigOptions OpenAI { get; set; }
        public AzureConfigOptions Azure { get; set; }
    }

    /// <summary>
    /// Options for Open AI
    /// </summary>
    public class OpenAIConfigOptions
    {
        public string ApiKey { get; set; }
    }

    /// <summary>
    /// Options for Azure OpenAI and Azure Content Safety
    /// </summary>
    public class AzureConfigOptions
    {
        public string OpenAIApiKey { get; set; }
        public string OpenAIEndpoint { get; set; }
    }
}
