using {{SafeProjectName}}.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace {{SafeProjectName}}
{
    public static class Repair
    {       
        [FunctionName("Repair")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req,
            ILogger log)
        {
            // Log that the HTTP trigger function received a request
            log.LogInformation("C# HTTP trigger function processed a request.");

            // Create a new RepairModel object and set its properties
            var repair = new RepairModel
            {
                Id = 1,
                Title = "Oil change",
                Description = "Need to drain the old engine oil and replace it with fresh oil to keep the engine lubricated and running smoothly.",
                AssignedTo = "Karin Blair",
                Date = "2023-05-23",
                Image = "https://www.howmuchisit.org/wp-content/uploads/2011/01/oil-change.jpg"
            };

            // Return a response with the RepairModel object
            return new OkObjectResult(repair);
        }
    }
}
