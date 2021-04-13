using Microsoft.AspNetCore.Authorization;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth.Models
{
    public class AppIdRequirement : IAuthorizationRequirement
    {
        public AppIdRequirement(string[] appIds)
        {
            this.AppIds = appIds;
        }

        public string[] AppIds { get; set; }
    }

    public class IdentityRequirement : IAuthorizationRequirement
    {
        public IdentityRequirement(JWTIdentityType type)
        {
            this.identity = type;
        }

        public JWTIdentityType identity { get; }
    }
}
