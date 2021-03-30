using System;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    public static class TeamsFxBindingExtensions
    {
        public static IWebJobsBuilder AddTeamsFxBinding(this IWebJobsBuilder builder)
        {
            if (builder == null)
            {
                throw new ArgumentNullException(nameof(builder));
            }

            builder.AddExtension<TeamsFxBindingExtensionProvider>();
            return builder;
        }
    }
}
