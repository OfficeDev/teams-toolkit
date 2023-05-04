// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    /// <summary>
    /// The options to add a conversation reference.
    /// </summary>
    public class ConversationReferenceStoreAddOptions
    {
        /// <summary>
        /// Gets or sets a value indicating whether to overwrite the existing conversation reference.
        /// </summary>
        public bool? Overwrite { get; set; }
    }
}
