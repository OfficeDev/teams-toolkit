namespace {{ProjectName}}.Controllers
{
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Integration.AspNet.Core;
    using Microsoft.TeamsFx.Conversation;

    [Route("api/messages")]
    [ApiController]
    public class BotController : ControllerBase
    {
        private readonly CloudAdapter _adapter;
        private readonly ConversationBot _conversation;
        private readonly IBot _bot;

        public BotController(CloudAdapter adapter, ConversationBot conversation, IBot bot)
        {
            _adapter = adapter;
            _conversation = conversation;
            _bot = bot;
        }

        [HttpPost]
        public async Task PostAsync(CancellationToken cancellationToken = default)
        {
            await _adapter.ProcessAsync
            (
                Request,
                Response,
                _bot,
                cancellationToken
            );
        }
    }
}
