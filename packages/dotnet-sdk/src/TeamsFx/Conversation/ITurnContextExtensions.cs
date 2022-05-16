// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema.Teams;

    static internal class ITurnContextExtensions
    {
        static internal string GetTeamsBotInstallationId(this ITurnContext context)
        {
            string result = null;
            var activity = context?.Activity;
            if (activity != null)
            {
                var channelData = activity.GetChannelData<TeamsChannelData>();
                if (channelData != null)
                {
                    result = channelData?.Team?.Id;
                }

                if (result == null)
                {
                    result = activity.Conversation?.Id;
                }
            }

            return result;
        }
    }
}
