namespace {{ProjectName}}.Controllers
{
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.TeamsFx.Conversation;

    [Route("api/notification")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly ConversationBot _conversation;

        public NotificationController(ConversationBot conversation)
        {
            this._conversation = conversation;
        }

        [HttpPost]
        public async Task<ActionResult> PostAsync(CancellationToken cancellationToken = default)
        {
            var installations = await this._conversation.Notification.GetInstallationsAsync(cancellationToken);
            foreach (var installation in installations)
            {
                // TODO: add card
                await installation.SendMessage("Hello.", cancellationToken);
            }
            return Ok();
        }
    }
}
