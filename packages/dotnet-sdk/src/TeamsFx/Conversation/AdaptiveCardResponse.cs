// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    /// <summary>
    /// Options used to control how the response card will be sent to users.
    /// </summary>
    public enum AdaptiveCardResponse
    {
        /// <summary>
        /// The response card will be replaced the current one for the interactor who trigger the action.
        /// </summary>
        ReplaceForInteractor = 0,

        /// <summary>
        /// The response card will be replaced the current one for all users in the chat.
        /// </summary>
        ReplaceForAll,

        /// <summary>
        /// The response card will be sent as a new message for all users in the chat.
        /// </summary>
        NewForAll,
    }
}
