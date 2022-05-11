namespace Microsoft.TeamsFx.Conversation
{
    using Microsoft.Bot.Builder;

    /// <summary>
    /// Options to initialize <see cref="ConversationBot"/>.
    /// </summary>
    public class ConversationOptions
    {
        /// <summary>
        /// The bot adapter.
        /// </summary>
        public BotAdapter Adapter { get; set; }

        /// <summary>
        /// The notification options. Null means notification is disabled.
        /// </summary>
        public NotificationOptions Notification { get; set; }
    }
}
