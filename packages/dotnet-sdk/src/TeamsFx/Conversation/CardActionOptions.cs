// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    /// <summary>
    /// Options to initialize a <see cref="CommandBot"/>.
    /// </summary>
    public class CardActionOptions
    {
        /// <summary>
        /// Gets or sets a set of adaptive card action handlers used to process card actions for this bot.
        /// </summary>
        /// <value>
        /// The card action handlers used to process command.
        /// </value>
        public IList<IAdaptiveCardActionHandler> Actions { get; set; }
    }
}
