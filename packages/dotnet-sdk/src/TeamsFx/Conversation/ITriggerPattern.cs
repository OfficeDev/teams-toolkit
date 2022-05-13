// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    /// <summary>
    /// Defines a contract that represents a trigger used to trigger command handler.
    /// </summary>
    public interface ITriggerPattern
    {
        /// <summary>
        /// Gets or sets the pattern.
        /// </summary>
        public string Pattern { get; set; }

        /// <summary>
        /// Gets the trigger type.
        /// </summary>
        public CommandTriggerType TriggerType { get; }

        /// <summary>
        /// Check whether the trigger pattern is matched.
        /// </summary>
        /// <param name="input">The input string.</param>
        /// <returns>True if the trigger can be fired, otherwise false.</returns>
        bool ShouldTrigger(string input);
    }
}
