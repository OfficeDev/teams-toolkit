// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Teams;
using Microsoft.Bot.Schema.Teams;

namespace Microsoft.TeamsFx.Helper
{
    /// <summary>
    /// Helper class used to wrap static method and simplify unit test.
    /// </summary>
    internal class TeamsInfoWrapper : ITeamsInfo
    {
        public Task<TeamsChannelAccount> GetTeamsMemberAsync(ITurnContext context, string userId, CancellationToken cancellationToken = default)
        {
            return TeamsInfo.GetMemberAsync(context, userId, cancellationToken);
        }
    }
}
