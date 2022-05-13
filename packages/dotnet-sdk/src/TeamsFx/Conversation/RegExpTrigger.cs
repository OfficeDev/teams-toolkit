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

        /// <summary>
        /// Initializes a new instance of the <see cref="RegExpTrigger"/> class.
        /// </summary>
        /// <param name="pattern">The regular expression pattern string.</param>
        /// <exception cref="ArgumentNullException"><paramref name="pattern"/> is null.</exception>
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
