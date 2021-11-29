// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Configuration;
using Microsoft.TeamsFx.Helper;
using Microsoft.TeamsFx.Model;

using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

using AccessToken = Microsoft.TeamsFx.Model.AccessToken;

namespace Microsoft.TeamsFx;

/// <summary>
/// Represent Teams current user's identity, and it is used within Teams tab application.
/// </summary>
/// <remarks>
/// Can only be used within Teams.
/// </remarks>
public class TeamsUserCredential : TokenCredential, IAsyncDisposable
{
    private readonly AuthenticationOptions _authenticationOptions;
    internal AccessToken _ssoToken;
    internal bool _isWebAssembly;

    #region JS Interop
    private readonly Lazy<Task<IJSObjectReference>> _teamsSdkTask;
    private readonly IJSRuntime _jsRuntime;
    #endregion

    #region Util
    private readonly ILogger<TeamsUserCredential> _logger;
    private readonly IHttpClientFactory _clientFactory;
    private readonly IMemoryCache _cache;

    private const int HttpRequestMaxRetryCount = 3;
    private const int HttpRequestRetryTimeSpanInMillisecond = 3000;
    #endregion

    /// <summary>
    /// Constructor of TeamsUserCredential.
    /// Developer need to configure TeamsFx service before using this class.
    /// </summary>
    /// <param name="authenticationOptions">Authentication options filled by DI.</param>
    /// <param name="jsRuntime">JavaScript interop runtime.</param>
    /// <param name="logger">Logger of TeamsUserCredential Class.</param>
    /// <param name="clientFactory">Http factory.</param>
    /// <param name="memoryCache">Memory cache used in Blazor server app.</param>
    /// <exception cref="ExceptionCode.InvalidConfiguration">When client id, initiate login endpoint or simple auth endpoint is missing or invalid in config.</exception>
    public TeamsUserCredential(
        IOptions<AuthenticationOptions> authenticationOptions,
        IJSRuntime jsRuntime,
        ILogger<TeamsUserCredential> logger,
        IHttpClientFactory clientFactory,
        IMemoryCache memoryCache)
    {
        _logger = logger;
        try
        {
            _logger.LogTrace("Validate authentication configuration");
            _authenticationOptions = authenticationOptions.Value;
        }
        catch (OptionsValidationException e)
        {
            throw new ExceptionWithCode($"Authentication config is missing or not correct with error: {e.Message}", ExceptionCode.InvalidConfiguration);
        }
        _teamsSdkTask = new(() => ImportTeamsSdk(jsRuntime).AsTask());
        _jsRuntime = jsRuntime;

        _clientFactory = clientFactory;
        _cache = memoryCache;
        _isWebAssembly = jsRuntime is IJSInProcessRuntime;

        logger.LogInformation("Create teams user credential");
    }

    /// <summary>
    /// Get basic user info from Teams SSO token.
    /// <example>
    /// For example:
    /// <code>
    /// var user = await teamsUserCredential.GetUserInfoAsync();
    /// </code>
    /// </example>
    /// </summary>
    /// <returns>Basic user info with user displayName, objectId and preferredUserName.</returns>
    /// <exception cref="ExceptionCode.InternalError">When SSO token from Teams client is not valid.</exception>
    /// <exception cref="ExceptionCode.InvalidParameter">When SSO token from Teams client is empty.</exception>
    public async ValueTask<UserInfo> GetUserInfoAsync()
    {
        _logger.LogInformation("Get basic user info from SSO token");
        var ssoToken = await GetSsoTokenAsync().ConfigureAwait(false);
        try
        {
            var userInfo = Utils.GetUserInfoFromSsoToken(ssoToken.Token);
            return userInfo;
        }
        catch (ExceptionWithCode e)
        {
            _logger.LogError(e.Message);
            throw;
        }
    }

    /// <summary>
    /// Popup login page to get user's access token with specific scopes.
    /// </summary>
    ///
    /// <param name="scopes">The string of Microsoft Token scopes of access. Default value is `.default`.</param>
    ///
    /// <example>
    /// For example:
    /// <code>
    /// await teamsUserCredential.LoginAsync("User.Read"); // single scopes using string
    /// await teamsUserCredential.LoginAsync("User.Read Calendars.Read"); // multiple scopes using string
    /// </code>
    /// </example>
    ///
    /// <remarks>
    /// Only works in Teams client app. User will be redirected to the authorization page to login and consent.
    /// </remarks>
    ///
    /// <exception cref="ExceptionCode.InternalError">When failed to login with unknown error.</exception>
    /// <exception cref="ExceptionCode.ServiceError">When simple auth server failed to exchange access token.</exception>
    /// <exception cref="ExceptionCode.ConsentFailed">When user canceled or failed to consent.</exception>
    public async Task LoginAsync(string scopes)
    {
        _logger.LogInformation($"Popup login page to get user's access token with scopes: {scopes}");

        await InitializeTeamsSdk().ConfigureAwait(false);

        try
        {
            var teamsSdk = await _teamsSdkTask.Value.ConfigureAwait(false);
            var url = $"{_authenticationOptions.InitiateLoginEndpoint}?clientId={_authenticationOptions.ClientId}&scope={WebUtility.UrlEncode(scopes)}";
            var token = await teamsSdk.InvokeAsync<string>("authenticate", url).ConfigureAwait(false);
            if (string.IsNullOrEmpty(token))
            {
                var errorMessage = "Get empty authentication result from Teams";
                _logger.LogError(errorMessage);
                throw new ExceptionWithCode(errorMessage, ExceptionCode.InternalError);
            }

            var authCode = JsonSerializer.Deserialize<AuthCode>(token, new JsonSerializerOptions { IncludeFields = true });
            await ExchangeAccessTokenFromSimpleAuthServer(scopes, authCode).ConfigureAwait(false);
        }
        catch (JSException e)
        {
            var errorMessage = $"Consent failed for the scope ${scopes} with error: ${e.Message}";
            _logger.LogError(errorMessage);
            throw new ExceptionWithCode(errorMessage, ExceptionCode.ConsentFailed);
        }
    }

    /// <summary>
    /// Popup login page to get user's access token with specific scopes.
    /// </summary>
    ///
    /// <param name="scopes">The array of Microsoft Token scopes of access. Default value is `[.default]`.</param>
    ///
    /// <example>
    /// For example:
    /// <code>
    /// await teamsUserCredential.LoginAsync(new string[] { "User.Read" }); // single scope using string array
    /// await teamsUserCredential.LoginAsync(new string[] { "User.Read Calendars.Read" }); //  multiple scopes using string array
    /// </code>
    /// </example>
    ///
    /// <remarks>
    /// Only works in Teams client APP. User will be redirected to the authorization page to login and consent.
    /// </remarks>
    ///
    /// <exception cref="ExceptionCode.InternalError">When failed to login with unknown error.</exception>
    /// <exception cref="ExceptionCode.ServiceError">When simple auth server failed to exchange access token.</exception>
    /// <exception cref="ExceptionCode.ConsentFailed">When user canceled or failed to consent.</exception>
    public async Task LoginAsync(string[] scopes)
    {
        var scopeString = string.Join(' ', scopes);
        await LoginAsync(scopeString).ConfigureAwait(false);
    }

    /// <summary>
    /// Gets an Azure.Core.AccessToken for the specified set of scopes.
    /// </summary>
    /// <param name="requestContext">The Azure.Core.TokenRequestContext with authentication information.</param>
    /// <param name="cancellationToken">The System.Threading.CancellationToken to use.</param>
    /// <returns>A valid Azure.Core.AccessToken.</returns>
    ///
    /// <exception cref="ExceptionCode.InternalError">When failed to login with unknown error.</exception>
    /// <exception cref="ExceptionCode.UiRequiredError">When need user consent to get access token.</exception>
    /// <exception cref="ExceptionCode.ServiceError">When failed to get access token from simple auth server.</exception>
    ///
    /// <example>
    /// For example:
    /// <code>
    /// // Get Graph access token for single scope
    /// await teamsUserCredential.GetTokenAsync(new TokenRequestContext(new string[] { "User.Read" }), new CancellationToken());
    /// // Get Graph access token for multiple scopes
    /// await teamsUserCredential.GetTokenAsync(new TokenRequestContext(new string[] { "User.Read", "Application.Read.All" }), new CancellationToken());
    /// </code>
    /// </example>
    /// <remarks>
    /// Can only be used within Teams.
    /// </remarks>
    public async override ValueTask<Azure.Core.AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken)
    {
        var scopes = requestContext.Scopes;
        var ssoToken = await GetSsoTokenAsync().ConfigureAwait(false);
        if (scopes == null || scopes.Length == 0)
        {
            _logger.LogInformation("Get SSO token");
            return ssoToken.ToAzureAccessToken();
        }
        else
        {
            var scopeString = string.Join(' ', scopes);
            _logger.LogInformation($"Get access token with scopes: {scopeString}");
            var cacheKey = Utils.GetCacheKey(ssoToken.Token, scopeString, _authenticationOptions.ClientId);
            var cachedToken = await GetTokenFromCacheAsync(cacheKey).ConfigureAwait(false);

            if (cachedToken != null)
            {
                if (!cachedToken.NearExpiration())
                {
                    _logger.LogTrace("Get access token from cache");
                    return cachedToken.ToAzureAccessToken();
                }
                else
                {
                    _logger.LogTrace("Cached access token is expired");
                }
            }
            else
            {
                _logger.LogTrace("No cached access token");
            }

            var accessToken = await GetAndCacheAccessTokenFromSimpleAuthServer(scopeString).ConfigureAwait(false);
            return accessToken.ToAzureAccessToken();
        }
    }

    /// <summary>
    /// Sync version is not supported now. Please use GetTokenAsync instead.
    /// </summary>
    public override Azure.Core.AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    /// <summary>
    /// Dispose.
    /// </summary>
    /// <returns></returns>
    public async ValueTask DisposeAsync()
    {
        if (_teamsSdkTask.IsValueCreated)
        {
            var instance = await _teamsSdkTask.Value.ConfigureAwait(false);
            await instance.DisposeAsync().ConfigureAwait(false);
        }
    }

    private async ValueTask<IJSObjectReference> ImportTeamsSdk(IJSRuntime jsRuntime)
    {
        try
        {
            await jsRuntime.InvokeVoidAsync("import", "https://statics.teams.cdn.office.net/sdk/v1.10.0/js/MicrosoftTeams.min.js").ConfigureAwait(false);
            return await jsRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/Microsoft.TeamsFx/jsInterop.js").AsTask().ConfigureAwait(false);
        }
        catch (JSException e)
        {
            throw new ExceptionWithCode(e.Message, ExceptionCode.JSRuntimeError);
        }
    }

    /// <summary>
    /// Get SSO token using teams SDK.
    /// It will try to get SSO token from memory first, if SSO token doesn't exist or about to expired, then it will using teams SDK to get SSO token
    /// </summary>
    /// <returns></returns>
    private async Task<AccessToken> GetSsoTokenAsync()
    {
        if (_ssoToken != null)
        {
            if (!_ssoToken.NearExpiration())
            {
                _logger.LogTrace("Get SSO token from memory cache");
                return _ssoToken;
            }
        }

        await InitializeTeamsSdk().ConfigureAwait(false);

        string token;
        try
        {
            var teamsSdk = await _teamsSdkTask.Value.ConfigureAwait(false);
            token = await teamsSdk.InvokeAsync<string>("getAuthToken").ConfigureAwait(false);
            if (string.IsNullOrEmpty(token))
            {
                var errorMessage = "Get empty SSO token from Teams";
                _logger.LogError(errorMessage);
                throw new ExceptionWithCode(errorMessage, ExceptionCode.InternalError);
            }
        }
        catch (JSException e)
        {
            var errorMessage = $"Get SSO token failed with error: {e.Message}";
            _logger.LogError(errorMessage);
            throw new ExceptionWithCode(errorMessage, ExceptionCode.InternalError);
        }
        try
        {
            var tokenObject = Utils.ParseJwt(token);
            var version = tokenObject.Payload["ver"].ToString();
            if (version != "1.0" && version != "2.0")
            {
                var errorMessage = $"SSO token is not valid with an unknown version: {version}";
                _logger.LogError(errorMessage);
                throw new ExceptionWithCode(errorMessage, ExceptionCode.InternalError);
            }

            var exp = tokenObject.Payload["exp"].ToString();
            var expireTime = DateTimeOffset.FromUnixTimeSeconds(long.Parse(exp));
            _ssoToken = new AccessToken(token, expireTime);
            return _ssoToken;
        }
        catch (ExceptionWithCode e)
        {
            _logger.LogError(e.Message);
            throw;
        }
    }

    /// <summary>
    /// Get access token from simple authentication server.
    /// </summary>
    /// <param name="scopeString"></param>
    /// <returns></returns>
    private async ValueTask<AccessToken> GetAndCacheAccessTokenFromSimpleAuthServer(string scopeString)
    {
        _logger.LogTrace($"Get access token from authentication server with scopes: {scopeString}");
        var httpClient = await GetAuthorizedHttpClient().ConfigureAwait(false);
        var data = new {
            scope = scopeString,
            grant_type = GrantType.SsoToken
        };
        var response = await httpClient.PostAsync("auth/token",
            new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, "application/json")).ConfigureAwait(false);
        var content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        if (response.IsSuccessStatusCode)
        {
            var oauthToken = JsonSerializer.Deserialize<SimpleAuthAccessToken>(content, new JsonSerializerOptions { IncludeFields = true });
            var accessToken = new AccessToken(oauthToken.access_token, oauthToken.expires_on);
            var cacheKey = Utils.GetCacheKey(accessToken.Token, scopeString, _authenticationOptions.ClientId);
            await SetTokenToCacheAsync(cacheKey, accessToken).ConfigureAwait(false);
            return accessToken;
        }
        else
        {
            GenerateAuthServerError(content);
        }
        // never reach here
        return null;
    }

    private async Task<HttpClient> GetAuthorizedHttpClient()
    {
        var ssoToken = await GetSsoTokenAsync().ConfigureAwait(false);
        var httpClient = _clientFactory.CreateClient();
        httpClient.BaseAddress = new Uri(_authenticationOptions.SimpleAuthEndpoint);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken.Token);

        return httpClient;
    }

    private async Task<AccessToken> GetTokenFromCacheAsync(string cacheKey)
    {
        if (_isWebAssembly)
        {
            var tokenString = await _jsRuntime.InvokeAsync<string>("localStorage.getItem", cacheKey).ConfigureAwait(false);
            var cacheToken = JsonSerializer.Deserialize<AccessToken>(tokenString, new JsonSerializerOptions { IncludeFields = true });
            return cacheToken;
        }
        else
        {
            // Look for cache key.
            if (_cache.TryGetValue(cacheKey, out AccessToken cacheToken))
            {
                return cacheToken;
            }
            return null;
        }
    }

    private async Task SetTokenToCacheAsync(string cacheKey, AccessToken accessToken)
    {
        if (_isWebAssembly)
        {
            var tokenString = JsonSerializer.Serialize(accessToken);
            await _jsRuntime.InvokeVoidAsync("localStorage.setItem", cacheKey, tokenString).ConfigureAwait(false);
        }
        else
        {
            _cache.Set(cacheKey, accessToken);
        }
    }

    private async Task ExchangeAccessTokenFromSimpleAuthServer(string scopes, AuthCode authCode)
    {
        var httpClient = await GetAuthorizedHttpClient().ConfigureAwait(false);
        var retryCount = 0;

        while (true)
        {
            var data = new {
                scope = scopes,
                authCode.code,
                code_verifier = authCode.codeVerifier,
                redirect_uri = authCode.redirectUri,
                grant_type = GrantType.AuthCode
            };
            var response = await httpClient.PostAsync("auth/token",
                new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, "application/json")).ConfigureAwait(false);
            var content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            if (response.IsSuccessStatusCode)
            {
                var simpleAuthAccessToken = JsonSerializer.Deserialize<SimpleAuthAccessToken>(content, new JsonSerializerOptions { IncludeFields = true });

                var accessToken = new AccessToken(simpleAuthAccessToken.access_token, simpleAuthAccessToken.expires_on);

                var ssoToken = await GetSsoTokenAsync().ConfigureAwait(false);
                var cacheKey = Utils.GetCacheKey(ssoToken.Token, scopes, _authenticationOptions.ClientId);
                await SetTokenToCacheAsync(cacheKey, accessToken).ConfigureAwait(false);
                return;
            }
            else
            {
                SimpleAuthError error;
                try
                {
                    error = JsonSerializer.Deserialize<SimpleAuthError>(content, new JsonSerializerOptions { IncludeFields = true });
                }
                catch (JsonException)
                {
                    error = null;
                }
                if (error != null)
                {
                    if (error.type == "AadUiRequiredException")
                    {
                        _logger.LogWarning("Exchange access token failed, retry...");
                        if (retryCount < HttpRequestMaxRetryCount)
                        {
                            await Task.Delay(HttpRequestRetryTimeSpanInMillisecond).ConfigureAwait(false);
                            retryCount++;
                            continue;
                        }
                    }
                }
                GenerateAuthServerError(content);
            }
        }
    }

    [DoesNotReturn]
    private void GenerateAuthServerError(string content)
    {
        SimpleAuthError error;
        string fullErrorMsg;
        try
        {
            error = JsonSerializer.Deserialize<SimpleAuthError>(content, new JsonSerializerOptions { IncludeFields = true });
        }
        catch (JsonException)
        {
            error = null;
        }
        if (error != null)
        {
            if (error.type == "AadUiRequiredException")
            {
                fullErrorMsg = $"Failed to get access token from authentication server, please login first: {content}";
                _logger.LogWarning(fullErrorMsg);
                throw new ExceptionWithCode(fullErrorMsg, ExceptionCode.UiRequiredError);
            }
            else
            {
                fullErrorMsg = $"Failed to get access token from authentication server: {content}";
                _logger.LogError(fullErrorMsg);
                throw new ExceptionWithCode(fullErrorMsg, ExceptionCode.ServiceError);
            }
        }
        else
        {
            fullErrorMsg = $"Failed to get access token with error: {content}";
            throw new ExceptionWithCode(fullErrorMsg, ExceptionCode.InternalError);
        }
    }

    private async Task InitializeTeamsSdk()
    {
        try
        {
            var teamsSdk = await _teamsSdkTask.Value.ConfigureAwait(false);
            await teamsSdk.InvokeVoidAsync("initialize").ConfigureAwait(false);
        }
        catch (JSException e)
        {
            if (e.Message == "timeout")
            {
                var errorMsg = "Initialize teams sdk timeout, maybe the code is not running inside Teams";
                _logger.LogError(errorMsg);
                throw new ExceptionWithCode(errorMsg, ExceptionCode.InternalError);
            }
        }
    }
}
