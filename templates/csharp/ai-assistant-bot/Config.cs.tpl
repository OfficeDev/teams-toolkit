namespace {{SafeProjectName}}
{
    public class ConfigOptions
    {
        public string MicrosoftAppType { get; set; }
        public string MicrosoftAppId { get; set; }
        public string MicrosoftAppTenantId { get; set; }
        public string MicrosoftAppPassword { get; set; }
        public OpenAIConfigOptions OpenAI { get; set; }
    }

    /// <summary>
    /// Options for Open AI
    /// </summary>
    public class OpenAIConfigOptions
    {
        public string ApiKey { get; set; }
        public string AssistantId { get; set; }
    }
}
