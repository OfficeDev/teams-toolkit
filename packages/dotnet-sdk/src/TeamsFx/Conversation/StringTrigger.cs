// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    /// <summary>
    /// Represents a command trigger that triggered by string match.
    /// </summary>
    ///  <seealso cref="ITeamsCommandHandler"/>
    public class StringTrigger : ITriggerPattern
    {
        /// <inheritdoc/>
        public string Pattern { get; set; }

        /// <inheritdoc/>
        public CommandTriggerType TriggerType => CommandTriggerType.String;

        public StringTrigger(string pattern)
        { 
            Pattern = pattern ?? throw new ArgumentNullException(nameof(pattern));
        }

        /// <inheritdoc/>
        public bool ShouldTrigger(string input)
        {
            return string.Equals(input, this.Pattern, StringComparison.OrdinalIgnoreCase);
        }
    }
}
