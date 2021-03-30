using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Microsoft.TeamsFxSimpleAuth.Components.Auth.Exceptions;
using Microsoft.TeamsFxSimpleAuth.Components.Auth.Models;
using Newtonsoft.Json;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Microsoft.TeamsFxSimpleAuth.Components.Auth
{
    public abstract class AuthenticatedUserHandler<TRequirement> : AuthorizationHandler<TRequirement> where TRequirement : IAuthorizationRequirement
    {
        protected ILogger<AuthenticatedUserHandler<TRequirement>> _logger;

        protected AuthenticatedUserHandler(ILogger<AuthenticatedUserHandler<TRequirement>> logger)
        {
            _logger = logger;
        }

        public override Task HandleAsync(AuthorizationHandlerContext context)
        {
            var user = context.User;
            var userIsNotAuthenticated =
                user?.Identity == null ||
                !user.Identities.Any(i => i.IsAuthenticated);
            if (userIsNotAuthenticated)
            {
                return Task.CompletedTask;
            }
            return base.HandleAsync(context);
        }
    }

    public class AppIdAuthorizationHandler : AuthenticatedUserHandler<AppIdRequirement>
    {
        public AppIdAuthorizationHandler(ILogger<AppIdAuthorizationHandler> logger)
            : base(logger) { }

        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, AppIdRequirement requirement)
        {
            _logger.LogDebug($"Handling app id requirement. Allowed app id list: {JsonConvert.SerializeObject(requirement.AppIds)}.");

            var allowedAppIds = requirement.AppIds;

            var version = context.User.FindFirstValue(JWTClaims.Version);

            string appId = null;

            if (string.Equals(JWTVersion.Ver2, version))
            {
                appId = context.User.FindFirstValue(JWTClaims.AZP);
            }
            else if (string.Equals(JWTVersion.Ver1, version))
            {
                appId = context.User.FindFirstValue(JWTClaims.AppId);
            }

            if (allowedAppIds == null || !allowedAppIds.Contains(appId))
            {
                throw new AuthorizationRequestDeniedException($"The App Id: {appId} is not allowed to call this API");
            }

            context.Succeed(requirement);

            return Task.CompletedTask;
        }
    }

    public class IdentityAuthorizationHandler : AuthenticatedUserHandler<IdentityRequirement>
    {
        public IdentityAuthorizationHandler(ILogger<IdentityAuthorizationHandler> logger)
            : base(logger) { }

        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, IdentityRequirement requirement)
        {
            _logger.LogDebug($"Handling identity requirement. Required identity type: {requirement.identity}.");

            var idtype = context.User.FindFirstValue(JWTClaims.IdType);
            var identity = GetIdentityTypeFromIdType(idtype);

            if(identity != requirement.identity)
            {
                throw new AuthorizationRequestDeniedException($"Token with idtyp {identity} mismatch requirement {requirement.identity}, is not accepted by this API");
            }

            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        private JWTIdentityType GetIdentityTypeFromIdType(string idType)
        {
            if (string.IsNullOrEmpty(idType))
            {
                return JWTIdentityType.UserIdentity;
            }
            else if(string.Equals(JWTIdentityScope.AppIdentityValue, idType))
            {
                return JWTIdentityType.ApplicationIdentity;
            }
            else
            {
                throw new AuthorizationRequestDeniedException($"Token with idType '{idType}' is not accepted by this API");
            }
        }
    }
}
