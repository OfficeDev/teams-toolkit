// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    /// <summary>
    /// Type of trigger pattern used to trigger a <see cref="ITeamsCommandHandler"/> instance.
    /// </summary>
    public enum CommandTriggerType
    {
        /// <summary>
        /// Triggered by string equals.
        /// </summary>
        String = 0,

        /// <summary>
        /// Trigger by regular expression match.
        /// </summary>
        RegExp
    }
}
