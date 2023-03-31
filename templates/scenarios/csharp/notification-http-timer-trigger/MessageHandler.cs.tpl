using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Bot.Builder;
using Microsoft.Extensions.Logging;
using Microsoft.TeamsFx.Conversation;

namespace {{SafeProjectName}}
{
    public sealed class MessageHandler
    {
        private readonly ConversationBot _conversation;
        private readonly IBot _bot;
        private readonly ILogger<MessageHandler> _log;

        public MessageHandler(ConversationBot conversation, IBot bot, ILogger<MessageHandler> log)
        {
            _conversation = conversation;
            _bot = bot;
            _log = log;
        }

        [FunctionName("MessageHandler")]
        public async Task<EmptyResult> Run([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "api/messages")] HttpRequest req)
        {
            _log.LogInformation("MessageHandler processes a request.");

            await (_conversation.Adapter as CloudAdapter).ProcessAsync(req, req.HttpContext.Response, _bot, req.HttpContext.RequestAborted);

            return new EmptyResult();
        }
    }
}
