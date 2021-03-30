using Microsoft.Azure.WebJobs.Hosting;
using Microsoft.Azure.WebJobs.Extensions.TeamsFx;

[assembly: WebJobsStartup(typeof(TeamsFxBindingStartup))]
namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    public class TeamsFxBindingStartup : IWebJobsStartup
    {
        public void Configure(IWebJobsBuilder builder)
        {
            builder.AddTeamsFxBinding();
        }
    }
}
