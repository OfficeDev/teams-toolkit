// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Teams;
    using Microsoft.Bot.Schema.Teams;
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
                    async (context, ct) => {
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

        /// <summary>
        /// Returns the first <see cref="Member"/> where predicate is true, and null otherwise.
        /// </summary>
        /// <param name="predicate">
        /// Find calls predicate once for each member of the installation, 
        /// until it finds one where predicate returns true. If such a member is found, 
        /// find immediately returns that member.Otherwise, find returns null.
        /// </param>
        /// <param name="scope">The scope to find members from the installations. 
        /// (personal chat, group chat, Teams channel)
        /// </param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The first <see cref="Member"/> where predicate is true, and null otherwise.</returns>
        /// <exception cref="ArgumentNullException">Throws when predicate is null.</exception>
        public async Task<Member> FindMemberAsync(
            Func<Member, Task<bool>> predicate,
            SearchScope scope = SearchScope.All,
            CancellationToken cancellationToken = default)
        {
            if (predicate == null)
            {
                throw new ArgumentNullException(nameof(predicate));
            }

            var installations = await GetInstallationsAsync(cancellationToken).ConfigureAwait(false);
            foreach (var target in installations)
            {
                if (MatchSearchScope(target, scope))
                {
                    var members = await target.GetMembersAsync(cancellationToken).ConfigureAwait(false);
                    foreach (var member in members)
                    {
                        if (await predicate(member).ConfigureAwait(false))
                        {
                            return member;
                        }
                    }
                }
            }

            return null;
        }

        /// <summary>
        /// Returns all <see cref="Member"/> where predicate is true, and empty array otherwise.
        /// </summary>
        /// <param name="predicate">Find calls predicate for each member of the installation.</param>
        /// <param name="scope">The scope to find members from the installations. 
        /// (personal chat, group chat, Teams channel)
        /// </param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>An array of <see cref="Member"/> where predicate is true, and empty array otherwise.</returns>
        /// <exception cref="ArgumentNullException">Throws when predicate is null.</exception>
        public async Task<Member[]> FindAllMembersAsync(
            Func<Member, Task<bool>> predicate,
            SearchScope scope = SearchScope.All,
            CancellationToken cancellationToken = default)
        {
            if (predicate == null)
            {
                throw new ArgumentNullException(nameof(predicate));
            }

            var result = new List<Member>();
            var installations = await GetInstallationsAsync(cancellationToken).ConfigureAwait(false);
            foreach (var target in installations)
            {
                if (MatchSearchScope(target, scope))
                {
                    var members = await target.GetMembersAsync(cancellationToken).ConfigureAwait(false);
                    foreach (var member in members)
                    {
                        if (await predicate(member).ConfigureAwait(false))
                        {
                            result.Add(member);
                        }
                    }
                }
            }

            return result.ToArray();
        }

        /// <summary>
        /// Returns the first <see cref="Channel"/> where predicate is true, and null otherwise.
        /// (Ensure the bot app is installed into the `General` channel, otherwise null will be returned.)
        /// </summary>
        /// <param name="predicate">
        /// Find calls predicate once for each channel of the installation, 
        /// until it finds one where predicate returns true. If such a channel is found, 
        /// find immediately returns that channel.Otherwise, find returns null.
        /// </param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The first <see cref="Channel"/> where predicate is true, and null otherwise.</returns>
        /// <exception cref="ArgumentNullException">Throws when predicate is null.</exception>
        public async Task<Channel> FindChannelAsync(
            Func<Channel, TeamDetails, Task<bool>> predicate,
            CancellationToken cancellationToken = default)
        {
            if (predicate == null)
            {
                throw new ArgumentNullException(nameof(predicate));
            }

            var installations = await GetInstallationsAsync(cancellationToken).ConfigureAwait(false);
            foreach (var target in installations)
            {
                if (target.Type == NotificationTargetType.Channel)
                {
                    var teamDetails = await target.GetTeamDetailsAsync(cancellationToken).ConfigureAwait(false);
                    var channels = await target.GetChannelsAsync(cancellationToken).ConfigureAwait(false);
                    foreach (var channel in channels)
                    {
                        if (await predicate(channel, teamDetails).ConfigureAwait(false))
                        {
                            return channel;
                        }
                    }
                }
            }

            return null;
        }

        /// <summary>
        /// Returns all <see cref="Channel"/> where predicate is true, and empty array otherwise.
        /// (Ensure the bot app is installed into the `General` channel, otherwise empty array will be returned.)
        /// </summary>
        /// <param name="predicate">Predicate find calls predicate for each channel of the installation.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>An array of <see cref="Channel"/> where predicate is true, and empty array otherwise.</returns>
        /// <exception cref="ArgumentNullException">Throws when predicate is null.</exception>
        public async Task<Channel[]> FindAllChannelsAsync(
            Func<Channel, TeamDetails, Task<bool>> predicate,
            CancellationToken cancellationToken = default)
        {
            if (predicate == null)
            {
                throw new ArgumentNullException(nameof(predicate));
            }

            var result = new List<Channel>();
            var installations = await GetInstallationsAsync(cancellationToken).ConfigureAwait(false);
            foreach (var target in installations)
            {
                if (target.Type == NotificationTargetType.Channel)
                {
                    var teamDetails = await target.GetTeamDetailsAsync(cancellationToken).ConfigureAwait(false);
                    var channels = await target.GetChannelsAsync(cancellationToken).ConfigureAwait(false);
                    foreach (var channel in channels)
                    {
                        if (await predicate(channel, teamDetails).ConfigureAwait(false))
                        {
                            result.Add(channel);
                        }
                    }
                }
            }

            return result.ToArray();
        }

        private static bool MatchSearchScope(TeamsBotInstallation target, SearchScope scope = SearchScope.All)
        {
            return target.Type switch {
                NotificationTargetType.Channel => scope.HasFlag(SearchScope.Channel),
                NotificationTargetType.Person => scope.HasFlag(SearchScope.Person),
                NotificationTargetType.Group => scope.HasFlag(SearchScope.Group),
                _ => false,
            };
        }
    }
}
