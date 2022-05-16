// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;
    using Microsoft.Bot.Schema.Teams;

    internal class NotificationMiddleware : IMiddleware
    {
        private readonly INotificationTargetStorage _storage;

        public NotificationMiddleware(INotificationTargetStorage storage)
        {
            _storage = storage ?? throw new ArgumentNullException(nameof(storage));
        }

        public async Task OnTurnAsync(ITurnContext turnContext, NextDelegate next, CancellationToken cancellationToken = default)
        {
            var activityType = ClassifyActivity(turnContext.Activity);
            switch (activityType)
            {
                case ActivityType.CurrentBotInstalled:
                case ActivityType.TeamRestored:
                    {
                        var reference = turnContext.Activity.GetConversationReference();
                        await _storage.Write(reference.GetKey(), reference, cancellationToken).ConfigureAwait(false);
                        break;
                    }
                case ActivityType.CurrentBotMessaged:
                    {
                        await TryAddMessagedReference(turnContext, cancellationToken).ConfigureAwait(false);
                        break;
                    }
                case ActivityType.CurrentBotUninstalled:
                case ActivityType.TeamDeleted:
                    {
                        var reference = turnContext.Activity.GetConversationReference();
                        await _storage.Delete(reference.GetKey(), cancellationToken).ConfigureAwait(false);
                        break;
                    }
                default:
                    {
                        break;
                    }
            }

            await next(cancellationToken).ConfigureAwait(false);
        }

        private ActivityType ClassifyActivity(Activity activity)
        {
            var activityType = activity?.Type;
            if (ActivityTypes.InstallationUpdate.Equals(activityType, StringComparison.OrdinalIgnoreCase))
            {
                var action = activity.Action;
                if ("add".Equals(action, StringComparison.OrdinalIgnoreCase))
                {
                    return ActivityType.CurrentBotInstalled;
                }
                else
                {
                    return ActivityType.CurrentBotUninstalled;
                }
            }
            else if (ActivityTypes.ConversationUpdate.Equals(activityType, StringComparison.OrdinalIgnoreCase))
            {
                var eventType = activity.GetChannelData<TeamsChannelData>()?.EventType;
                if ("teamDeleted".Equals(eventType, StringComparison.OrdinalIgnoreCase))
                {
                    return ActivityType.TeamDeleted;
                }
                else if ("teamRestored".Equals(eventType, StringComparison.OrdinalIgnoreCase))
                {
                    return ActivityType.TeamRestored;
                }
            }
            else if (ActivityTypes.Message.Equals(activityType, StringComparison.OrdinalIgnoreCase))
            {
                return ActivityType.CurrentBotMessaged;
            }

            return ActivityType.Unknown;
        }

        private async Task<bool> TryAddMessagedReference(ITurnContext turnContext, CancellationToken cancellationToken = default)
        {
            var reference = turnContext.Activity.GetConversationReference();
            var conversationType = reference?.Conversation?.ConversationType;
            if ("personal".Equals(conversationType, StringComparison.OrdinalIgnoreCase) || "groupChat".Equals(conversationType, StringComparison.OrdinalIgnoreCase))
            {
                var existingReference = await _storage.Read(reference.GetKey(), cancellationToken).ConfigureAwait(false);
                if (existingReference != null)
                {
                    return false;
                }
                else
                {
                    await _storage.Write(reference.GetKey(), reference, cancellationToken).ConfigureAwait(false);
                    return true;
                }
            }
            else if ("channel".Equals(conversationType, StringComparison.OrdinalIgnoreCase))
            {
                var teamId = turnContext.Activity.GetChannelData<TeamsChannelData>()?.Team?.Id;
                if (teamId != null)
                {
                    var channelReference = reference.Clone();
                    channelReference.Conversation.Id = teamId;
                    var existingReference = await _storage.Read(channelReference.GetKey(), cancellationToken).ConfigureAwait(false);
                    if (existingReference != null)
                    {
                        return false;
                    }
                    else
                    {
                        await _storage.Write(channelReference.GetKey(), channelReference, cancellationToken).ConfigureAwait(false);
                        return true;
                    }
                }
                else
                {
                    return false;
                }
            }
            else
            {
                return false;
            }
        }
    }
}
