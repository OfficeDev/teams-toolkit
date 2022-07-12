// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Builder.Teams;
using Microsoft.Bot.Schema.Teams;
using Microsoft.Bot.Schema;
using System.Text.RegularExpressions;
using System.Net;
using Newtonsoft.Json.Linq;
using Microsoft.Bot.Connector;
using Microsoft.TeamsFx.Helper;
using Microsoft.Identity.Client;

namespace Microsoft.TeamsFx.Bot;

/// <summary>
/// Creates a new prompt that leverage Teams Single Sign On (SSO) support for bot to automatically sign in user and
/// help receive oauth token, asks the user to consent if needed.
/// </summary>
/// <remarks>
/// The prompt will attempt to retrieve the users current token of the desired scopes and store it in
/// the token store. 
/// User will be automatically signed in leveraging Teams support of Bot Single Sign On(SSO):
/// https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-aad-sso-bots
/// </remarks>
public class TeamsBotSsoPrompt : Dialog
{
    private TeamsBotSsoPromptSettings _settings;
    private const string PersistedExpires = "expires";


    /// <summary>
    /// Initializes a new instance of the <see cref="TeamsBotSsoPrompt"/> class.
    /// </summary>
    /// <param name="dialogId">The ID to assign to this prompt.</param>
    /// <param name="settings">Additional OAuth settings to use with this instance of the prompt.
    /// custom validation for this prompt.</param>
    /// <remarks>The value of <paramref name="dialogId"/> must be unique within the
    /// <see cref="DialogSet"/> or <see cref="ComponentDialog"/> to which the prompt is added.</remarks>
    public TeamsBotSsoPrompt(string dialogId, TeamsBotSsoPromptSettings settings) : base(dialogId)
    {
        if (string.IsNullOrWhiteSpace(dialogId))
        {
            throw new ArgumentNullException(nameof(dialogId));
        }
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
    }


    /// <summary>
    /// Called when the dialog is started and pushed onto the dialog stack.
    /// Developer need to configure TeamsFx service before using this class.
    /// </summary>
    /// <param name="dc">The Microsoft.Bot.Builder.Dialogs.DialogContext for the current turn of conversation.</param>
    /// <param name="options">Optional, initial information to pass to the dialog.</param>
    /// <param name="cancellationToken">A cancellation token that can be used by other objects or threads to receive notice of cancellation.</param>
    /// <returns> A System.Threading.Tasks.Task representing the asynchronous operation.</returns>
    /// <exception cref="ArgumentException">if dialog context argument is null</exception>
    /// <remarks>
    /// If the task is successful, the result indicates whether the dialog is still active after the turn has been processed by the dialog.
    /// </remarks>
    public override async Task<DialogTurnResult> BeginDialogAsync(DialogContext dc, object options = null, CancellationToken cancellationToken = default)
    {
        if (dc == null)
        {
            throw new ArgumentNullException(nameof(dc));
        }

        EnsureMsTeamsChannel(dc);

        var state = dc.ActiveDialog?.State;
        state[PersistedExpires] = DateTime.UtcNow.AddMilliseconds(_settings.Timeout);

        // Send OAuthCard that tells Teams to obtain an authentication token for the bot application.
        await SendOAuthCardToObtainTokenAsync(dc.Context, cancellationToken).ConfigureAwait(false);
        return EndOfTurn;
    }

    /// <summary>
    /// Called when the dialog is _continued_, where it is the active dialog and the
    /// user replies with a new activity.
    /// </summary>
    /// <param name="dc">The <see cref="DialogContext"/> for the current turn of conversation.</param>
    /// <param name="cancellationToken">A cancellation token that can be used by other objects
    /// or threads to receive notice of cancellation.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    /// <remarks>If the task is successful, the result indicates whether the dialog is still
    /// active after the turn has been processed by the dialog. The result may also contain a
    /// return value.
    ///
    /// If this method is *not* overridden, the dialog automatically ends when the user replies.
    /// </remarks>
    /// <seealso cref="DialogContext.ContinueDialogAsync(CancellationToken)"/>
    public override async Task<DialogTurnResult> ContinueDialogAsync(DialogContext dc, CancellationToken cancellationToken = default(CancellationToken))
    {
        EnsureMsTeamsChannel(dc);

        // Check for timeout
        var state = dc.ActiveDialog?.State;
        bool isMessage = (dc.Context.Activity.Type == ActivityTypes.Message);
        bool isTimeoutActivityType =
          isMessage ||
          IsTeamsVerificationInvoke(dc.Context) ||
          IsTokenExchangeRequestInvoke(dc.Context);

        // If the incoming Activity is a message, or an Activity Type normally handled by TeamsBotSsoPrompt,
        // check to see if this TeamsBotSsoPrompt Expiration has elapsed, and end the dialog if so.
        bool hasTimedOut = isTimeoutActivityType && DateTime.Compare(DateTime.UtcNow, (DateTime)state[PersistedExpires]) > 0;
        if (hasTimedOut)
        {
            return await dc.EndDialogAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
        }
        else
        {
            if (IsTeamsVerificationInvoke(dc.Context) || IsTokenExchangeRequestInvoke(dc.Context))
            {
                // Recognize token
                PromptRecognizerResult<TeamsBotSsoPromptTokenResponse> recognized = await RecognizeTokenAsync(dc, cancellationToken).ConfigureAwait(false);

                if (recognized.Succeeded)
                {
                    return await dc.EndDialogAsync(recognized.Value, cancellationToken).ConfigureAwait(false);
                }
            }
            else if (isMessage)
            {
                return await dc.EndDialogAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
            }

            return EndOfTurn;
        }
    }

    /// <summary>
    /// Shared implementation of the RecognizeTokenAsync function. This is intended for internal use, to
    /// consolidate the implementation of the OAuthPrompt and OAuthInput. Application logic should use
    /// those dialog classes.
    /// </summary>
    /// <param name="dc">DialogContext.</param>
    /// <param name="cancellationToken">CancellationToken.</param>
    /// <returns>PromptRecognizerResult.</returns>
    private async Task<PromptRecognizerResult<TeamsBotSsoPromptTokenResponse>> RecognizeTokenAsync(DialogContext dc, CancellationToken cancellationToken)
    {

        ITurnContext context = dc.Context;
        var result = new PromptRecognizerResult<TeamsBotSsoPromptTokenResponse>();
        TeamsBotSsoPromptTokenResponse tokenResponse = null;

        if (IsTokenExchangeRequestInvoke(context))
        {
            var tokenResponseObject = context.Activity.Value as JObject;
            string ssoToken = tokenResponseObject?.ToObject<TokenExchangeInvokeRequest>().Token;
            // Received activity is not a token exchange request
            if (String.IsNullOrEmpty(ssoToken))
            {
                var warningMsg =
                  "The bot received an InvokeActivity that is missing a TokenExchangeInvokeRequest value. This is required to be sent with the InvokeActivity.";
                await SendInvokeResponseAsync(context, HttpStatusCode.BadRequest, warningMsg, cancellationToken).ConfigureAwait(false);
            }
            else
            {
                try
                {
                    var cca = ConfidentialClientApplicationBuilder.Create(_settings.BotAuthOptions.ClientId)
                        .WithClientSecret(_settings.BotAuthOptions.ClientSecret)
                        .WithAuthority(_settings.BotAuthOptions.OAuthAuthority)
                        .Build();
                    var authenticationResult = await cca
                        .AcquireTokenOnBehalfOf(_settings.Scopes, new UserAssertion(ssoToken))
                        .ExecuteAsync(cancellationToken)
                        .ConfigureAwait(false);
                    var ssoTokenObj = Utils.ParseJwt(ssoToken);
                    tokenResponse = new TeamsBotSsoPromptTokenResponse {
                        SsoToken = ssoToken,
                        SsoTokenExpiration = ssoTokenObj.Payload["exp"].ToString(),
                        Token = authenticationResult.AccessToken,
                        Expiration = authenticationResult.ExpiresOn.ToString()
                    };

                    await SendInvokeResponseAsync(context, HttpStatusCode.OK, null, cancellationToken).ConfigureAwait(false);
                }
                catch (Exception e)
                {
                    var warningMsg = "The bot is unable to exchange token. Ask for user consent." + e.Message;
                    await SendInvokeResponseAsync(context, HttpStatusCode.PreconditionFailed, new TokenExchangeInvokeResponse {
                        Id = context.Activity.Id,
                        FailureDetail = warningMsg,
                    }, cancellationToken).ConfigureAwait(false);
                }

            }
        }
        else if (IsTeamsVerificationInvoke(context))
        {
            await SendOAuthCardToObtainTokenAsync(context, cancellationToken).ConfigureAwait(false);
            await SendInvokeResponseAsync(context, HttpStatusCode.OK, null, cancellationToken).ConfigureAwait(false);
        }

        if (tokenResponse != null)
        {
            result.Succeeded = true;
            result.Value = tokenResponse;
        } else
        {
            result.Succeeded = false;
        }
        return result;
    }

    private static async Task SendInvokeResponseAsync(ITurnContext turnContext, HttpStatusCode statusCode, object body, CancellationToken cancellationToken)
    {
        await turnContext.SendActivityAsync(
            new Activity {
                Type = ActivityTypesEx.InvokeResponse,
                Value = new InvokeResponse {
                    Status = (int)statusCode,
                    Body = body,
                },
            }, cancellationToken).ConfigureAwait(false);
    }

    private bool IsTeamsVerificationInvoke(ITurnContext context) {
       return (context.Activity.Type == ActivityTypes.Invoke) && (context.Activity.Name == SignInConstants.VerifyStateOperationName);
    }
    private bool IsTokenExchangeRequestInvoke(ITurnContext context) {
        return (context.Activity.Type == ActivityTypes.Invoke) && (context.Activity.Name == SignInConstants.TokenExchangeOperationName);
    }

    /// <summary>
    /// Send OAuthCard that tells Teams to obtain an authentication token for the bot application.
    /// For details see https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-aad-sso-bots.
    /// </summary>
    /// <param name="context">ITurnContext</param>
    /// <param name="cancellationToken">CancellationToken.</param>
    /// <returns>The task to await.</returns>
    private async Task SendOAuthCardToObtainTokenAsync(ITurnContext context, CancellationToken cancellationToken)
    {
        TeamsChannelAccount account = await TeamsInfo.GetMemberAsync(context, context.Activity.From.Id, cancellationToken).ConfigureAwait(false);

        string loginHint = account.UserPrincipalName ?? "";
        SignInResource signInResource = GetSignInResource(loginHint);

        // Ensure prompt initialized
        IMessageActivity prompt = Activity.CreateMessageActivity();
        prompt.Attachments = new List<Attachment>();
        prompt.Attachments.Add(new Attachment {
            ContentType = OAuthCard.ContentType,
            Content = new OAuthCard {
                Text = "Sign In",
                Buttons = new[]
                {
                            new CardAction
                            {
                                    Title = "Teams SSO Sign In",
                                    Value = signInResource.SignInLink,
                                    Type = ActionTypes.Signin,
                            },
                        },
                TokenExchangeResource = signInResource.TokenExchangeResource,
            },
        });
        // Send prompt
        await context.SendActivityAsync(prompt, cancellationToken).ConfigureAwait(false);
    }


    /// <summary>
    /// Get sign in authentication configuration
    /// </summary>
    /// <param name="loginHint"></param>
    /// <returns>sign in resource</returns>
    private SignInResource GetSignInResource(string loginHint)
    {
        string signInLink = $"{_settings.BotAuthOptions.LoginStartPageEndpoint}?scope={Uri.EscapeDataString(string.Join(" ", _settings.Scopes))}&clientId={_settings.BotAuthOptions.ClientId}&tenantId={_settings.BotAuthOptions.TenantId}&loginHint={loginHint}";

        SignInResource signInResource = new SignInResource {
            SignInLink = signInLink,
            TokenExchangeResource = new TokenExchangeResource {
                Id = Guid.NewGuid().ToString(),
                Uri = Regex.Replace(_settings.BotAuthOptions.ApplicationIdUri, @"/\/$/", "") + "/access_as_user"
            }
        };

        return signInResource;
    }

    /// <summary>
    /// Ensure bot is running in MS Teams since TeamsBotSsoPrompt is only supported in MS Teams channel.
    /// </summary>
    /// <param name="dc">dialog context</param>
    /// <exception cref="ExceptionCode.ChannelNotSupported"> if bot channel is not MS Teams </exception>
    private void EnsureMsTeamsChannel(DialogContext dc)
    {
        if (dc.Context.Activity.ChannelId != Channels.Msteams)
        {
            var errorMessage = "Teams Bot SSO Prompt is only supported in MS Teams Channel";
            throw new ExceptionWithCode(errorMessage, ExceptionCode.ChannelNotSupported);
        }
    }
}
