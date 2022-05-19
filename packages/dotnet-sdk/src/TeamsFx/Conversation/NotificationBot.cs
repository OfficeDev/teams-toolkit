// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Teams;
    using Microsoft.Rest;
    using System.Net;

    /// <summary>
    /// Provide utilities to send notification to varies targets (e.g., member, group, channel).
    /// </summary>
    public class NotificationBot
    {
        private readonly BotAdapter _adapter;
        private readonly string _botAppId;
        private readonly INotificationTargetStorage _storage;

        /// <summary>
        /// Create new instance of the <see cref="NotificationBot"/>.
        /// </summary>
        /// <param name="adapter">The bot adapter.</param>
        /// <param name="options">The initialize options.</param>
        /// <exception cref="ArgumentNullException">Throws if provided parameter is null.</exception>
        /// <exception cref="ArgumentException">Throws if provided parameter is invalid.</exception>
        public NotificationBot(BotAdapter adapter, NotificationOptions options)
        {
            _adapter = adapter ?? throw new ArgumentNullException(nameof(adapter));

            if (options == null)
            {
                throw new ArgumentNullException(nameof(options));
            }

            _botAppId = options.BotAppId;

            if (options.Storage != null)
            {
                _storage = options.Storage;
            }
            else
            {
                var onAzure = Environment.GetEnvironmentVariable("RUNNING_ON_AZURE");
                if ("1".Equals(onAzure))
                {
                    _storage = new LocalFileStorage(Path.GetFullPath(Environment.GetEnvironmentVariable("TEMP") ?? Environment.CurrentDirectory));
                }
                else
                {
                    _storage = new LocalFileStorage(Path.GetFullPath(Environment.GetEnvironmentVariable("TEAMSFX_NOTIFICATION_LOCALSTORE_DIR") ?? Environment.CurrentDirectory));
                }
            }

            _adapter.Use(new NotificationMiddleware(_storage));
        }

        /// <summary>
        /// Get all targets where the bot is installed.
        /// </summary>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>An array of <see cref="TeamsBotInstallation"/>.</returns>
        /// <remarks>
        /// The result is retrieving from the persisted storage.
        /// </remarks>
        public async Task<TeamsBotInstallation[]> GetInstallationsAsync(CancellationToken cancellationToken = default)
        {
            var references = await _storage.List(cancellationToken).ConfigureAwait(false);
            var installations = new List<TeamsBotInstallation>();
            foreach (var reference in references)
            {
                // validate connection
                var valid = true;
                await _adapter.ContinueConversationAsync
                (
                    _botAppId,
                    reference,
                    async (context, ct) =>
                    {
                        try
                        {
                            // try get member to see if the installation is still valid
                            await TeamsInfo.GetPagedMembersAsync(context, 1, null, ct).ConfigureAwait(false);
                        }
                        catch (Exception e)
                        {
                            if (e is HttpOperationException httpEx)
                            {
                                var response = httpEx.Response;
                                if (response != null)
                                {
                                    var status = response.StatusCode;
                                    var error = response.Content ?? string.Empty;
                                    if (status == HttpStatusCode.Forbidden && error.Contains("BotNotInConversationRoster"))
                                    {
                                        // bot is uninstalled
                                        valid = false;
                                    }
                                }
                            }
                        }
                    },
                    cancellationToken
                ).ConfigureAwait(false);
                if (valid)
                {
                    installations.Add(new TeamsBotInstallation(_botAppId, _adapter, reference));
                }
                else
                {
                    await _storage.Delete(reference.GetKey(), cancellationToken).ConfigureAwait(false);
                }
            }

            return installations.ToArray();
        }
    }
}
