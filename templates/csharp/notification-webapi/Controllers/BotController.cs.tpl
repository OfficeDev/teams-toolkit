using Microsoft.AspNetCore.Mvc;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.TeamsFx.Conversation;

namespace {{SafeProjectName}}.Controllers
{
    [Route("api/messages")]
    [ApiController]
    public class BotController : ControllerBase
    {
        private readonly ConversationBot _conversation;
        private readonly IBot _bot;

        public BotController(ConversationBot conversation, IBot bot)
        {
            this._conversation = conversation;
            this._bot = bot;
        }

        [HttpPost]
        public async Task PostAsync(CancellationToken cancellationToken = default)
        {
            await (this._conversation.Adapter as CloudAdapter).ProcessAsync(this.Request, this.Response, this._bot, cancellationToken);
        }
    }
}
