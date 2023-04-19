// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.ComponentModel.DataAnnotations;

namespace Microsoft.TeamsFx.Configuration;

/// <summary>
/// Authentication related configuration.
/// </summary>
public class AuthenticationOptions
{
    /// <summary>
    /// Entry name in configuration file.
    /// </summary>
    public const string Authentication = "Authentication";

    /// <summary>
    /// The client (application) ID of an App Registration in the tenant.
    /// </summary>
    [RegularExpression(@"^[0-9A-Fa-f\-]{36}$")]
    public string ClientId { get; set; }

    /// <summary>
    /// The secret of an App Registration in the tenant. (Created by Teams extension in user secrets)
    /// </summary>
    [Required(ErrorMessage = "Client secret is required")]
    public string ClientSecret { get; set; }

    /// <summary>
    /// Login page for Teams to redirect to.
    /// </summary>
    [RegularExpression(@"^http(s)?://[-a-zA-Z0-9@:%._\+~#=/]{1,256}$")]
    public string InitiateLoginEndpoint { get; set; }

    /// <summary>
    /// Application ID URI.
    /// </summary>
    public string ApplicationIdUri { get; set; }

    /// <summary>
    /// Authority URL that is used in OAuth On-behalf-of flow.
    /// </summary>
    [RegularExpression(@"^http(s)?://[-a-zA-Z0-9@:%._\+~#=/]{1,100}$")]
    public string OAuthAuthority { get; set; }

    /// <summary>
    /// Bot specific authentication configurations.
    /// </summary>
    public BotAuthenticationConfigurations Bot { get; set; }
}

/// <summary>
/// Bot specific authentication configurations.
/// </summary>
public class BotAuthenticationConfigurations
{
    /// <summary>
    /// Initiate login start page endpoint.
    /// </summary>
    [Required(ErrorMessage = "login start page endpoint uri is required")]
    public string InitiateLoginEndpoint { get; set; }
}