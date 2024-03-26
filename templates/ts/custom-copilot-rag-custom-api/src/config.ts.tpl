const config = {
  botId: process.env.BOT_ID,
  botPassword: process.env.BOT_PASSWORD,
  {{#useOpenAI}}
  openAIKey: process.env.OPENAI_API_KEY,
  {{/useOpenAI}}
  {{#useAzureOpenAI}}
  azureOpenAIKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  {{/useAzureOpenAI}}
};

export default config;
