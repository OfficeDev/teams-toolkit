// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    using System.Text.RegularExpressions;
    
    /// <summary>
    /// Represents a command trigger that triggered by regular expression match.
    /// </summary>
    /// <seealso cref="ITeamsCommandHandler"/>
    public class RegExpTrigger : ITriggerPattern
    {
        /// <inheritdoc/>
        public string Pattern { get; set; }

        /// <inheritdoc/>
        public CommandTriggerType TriggerType => CommandTriggerType.RegExp;

        public RegExpTrigger(string pattern)
        {
            Pattern = pattern ?? throw new ArgumentNullException(nameof(pattern));
        }

        /// <inheritdoc/>
        public bool ShouldTrigger(string input)
        {
            var regex = new Regex(Pattern, RegexOptions.IgnoreCase);
            return regex.IsMatch(input);
        }
    }
}
