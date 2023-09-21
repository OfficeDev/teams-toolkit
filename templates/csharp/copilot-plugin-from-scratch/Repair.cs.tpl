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
        [FunctionName("repair")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req,
            ILogger log)
        {
            // Log that the HTTP trigger function received a request.
            log.LogInformation("C# HTTP trigger function processed a request.");

            // Get the query parameters from the request.
            string assignedTo = req.Query["assignedTo"];

            // Get the repair records.
            var repairRecords = RepairData.GetRepairs();

            // Filter the repair records by the assignedTo query parameter.
            var repairs = repairRecords.Where(r =>
            {
                // Split assignedTo into firstName and lastName
                var parts = r.AssignedTo.Split(' ');

                // Check if the assignedTo query parameter matches the repair record's assignedTo value, or the repair record's firstName or lastName.
                return r.AssignedTo.Equals(assignedTo?.Trim(), StringComparison.InvariantCultureIgnoreCase) ||
                       parts[0].Equals(assignedTo?.Trim(), StringComparison.InvariantCultureIgnoreCase) ||
                       parts[1].Equals(assignedTo?.Trim(), StringComparison.InvariantCultureIgnoreCase);
            });
            
            // Return filtered repair records, or an empty array if no records were found.
            var results = new { results = repairs };
            return new OkObjectResult(results);
        }
    }
}