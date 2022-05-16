// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    using System.Text.RegularExpressions;

    /// <summary>
    /// Represents the command message received from Teams.
    /// </summary>
    public class CommandMessage
    {
        /// <summary>
        /// Gets or sets the text of the message sent by the user.
        /// </summary>
        public string Text { get; set; }

        /// <summary>
        /// Gets or sets a collection of the <see cref="Match"/> objects that matches to the trigger pattern of 
        /// a command handler. If no matches are found, the method returns an empty collection object.
        /// </summary>
        public MatchCollection Matches { get; set; }
    }
}
