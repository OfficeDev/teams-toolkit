namespace Microsoft.TeamsFx.Conversation
{
    using Microsoft.Bot.Builder;

    /// <summary>
    /// Provide utilities for bot conversation, including:
    /// <list type="bullet">
    ///     <item>
    ///         <description>send notification to varies targets (e.g., member, group, channel).</description>
    ///     </item>
    /// </list>
    /// </summary>
    /// <remarks>
    /// <para>
    /// Set <c>Adapter</c> in <see cref="ConversationOptions"/> to use your own bot adapter.
    /// </para>
    /// <para>
    /// For notification, set <c>Notification.Storage</c> in <see cref="ConversationOptions"/> to use your own storage implementation.
    /// </para>
    /// </remarks>
    public class ConversationBot
    {
        /// <summary>
        /// The bot adapter.
        /// </summary>
        public BotAdapter Adapter { get; private set; }

        /// <summary>
        /// The entrypoint of notification.
        /// </summary>
        public NotificationBot Notification { get; private set; }

        /// <summary>
        /// Creates new instance of the <see cref="ConversationBot"/>.
        /// </summary>
        /// <param name="options">Initialize options.</param>
        /// <exception cref="ArgumentNullException">Throws if provided parameter is null.</exception>
        /// <exception cref="ArgumentException">Throws if provided parameter is invalid.</exception>
        /// <remarks>
        /// It's recommended to create your own adapter and storage for production environment.
        /// </remarks>
        public ConversationBot(ConversationOptions options)
        {
            if (options == null)
            {
                throw new ArgumentNullException(nameof(options));
            }

            Adapter = options.Adapter ?? throw new ArgumentException("Adapter is null.", nameof(options));

            if (options.Notification != null && options.Notification.Enabled)
            {
                Notification = new NotificationBot(Adapter, options.Notification);
            }
        }
    }
}
