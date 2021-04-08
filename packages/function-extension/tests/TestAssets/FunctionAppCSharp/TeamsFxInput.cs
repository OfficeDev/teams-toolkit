using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx.TestsAssets.FunctionAppCSharp
{
    public static class TeamsFxInput
    {
        [FunctionName("TeamsFxInput")]
        public static IActionResult Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = "teamsfxbinding")] HttpRequest req,
            ILogger log,
            [TeamsFx] string TeamsFxContext)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            return new OkObjectResult(TeamsFxContext);
        }
    }
}
