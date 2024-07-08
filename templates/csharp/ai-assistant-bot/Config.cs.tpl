namespace {{SafeProjectName}}
{
    public class ConfigOptions
    {
        public string BOT_ID { get; set; }
        public string BOT_PASSWORD { get; set; }
        public string BOT_TYPE { get; set; }
        public string BOT_TENANT_ID { get; set; }
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
