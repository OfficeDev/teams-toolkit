namespace {{ProjectName}}.Controllers
{
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Integration.AspNet.Core;

    [Route("api/messages")]
    [ApiController]
    public class BotController : ControllerBase
    {
        private readonly CloudAdapter _adapter;
        private readonly IBot _bot;

        public BotController(CloudAdapter adapter, IBot bot)
        {
            this._adapter = adapter;
            this._bot = bot;
        }

        [HttpPost]
        public async Task PostAsync(CancellationToken cancellationToken = default)
        {
            await this._adapter.ProcessAsync(this.Request, this.Response, this._bot, cancellationToken);
        }
    }
}
