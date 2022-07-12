// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.TeamsFx.Configuration;
using System.ComponentModel.DataAnnotations;

namespace Microsoft.TeamsFx.Bot;

/// <summary>
/// Contains settings for an <see cref="TeamsBotSsoPrompt"/>.
/// </summary>
public class TeamsBotSsoPromptSettings
{

    /// <summary>
    /// Constructor of TeamsBotSsoPromptSettings
    /// </summary>
    public TeamsBotSsoPromptSettings(BotAuthenticationOptions botAuthOptions, string[] scopes, TimeSpan? timeout = null, bool? endOnInvalidMessage = null)
    {
        BotAuthOptions = botAuthOptions;
        Scopes = scopes;
        Timeout = timeout ?? TimeSpan.FromMinutes(15);
        EndOnInvalidMessage = endOnInvalidMessage ?? true;
    }

    /// <summary>
    /// Gets or sets the array of strings that declare the desired permissions and the resources requested.
    /// </summary>
    /// <value>The array of strings that declare the desired permissions and the resources requested.</value>
    [Required(ErrorMessage = "Scope is required")]
    public string[] Scopes { get; set; }

    /// <summary>
    /// Gets or sets the number of milliseconds the prompt waits for the user to authenticate.
    /// Default is 900,000 (15 minutes).
    /// </summary>
    /// <value>The number of milliseconds the prompt waits for the user to authenticate.</value>
    public TimeSpan Timeout { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the <see cref="TeamsBotSsoPrompt"/> should end upon
    /// receiving an invalid message.  Generally the <see cref="TeamsBotSsoPrompt"/> will end 
    /// the auth flow when receives user message not related to the auth flow.
    /// Setting the flag to false ignores the user's message instead.
    /// Defaults to value `true`
    /// </summary>
    /// <value>True if the <see cref="TeamsBotSsoPrompt"/> should automatically end upon receiving
    /// an invalid message.</value>
    public bool EndOnInvalidMessage { get; set; }

    /// <summary>
    /// Gets or sets bot related authentication options.
    /// </summary>
    public BotAuthenticationOptions BotAuthOptions { get; set; }
}