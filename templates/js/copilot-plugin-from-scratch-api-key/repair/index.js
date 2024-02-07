/* This code sample provides a starter kit to implement server side logic for your Teams App in TypeScript,
 * refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference for
 * complete Azure Functions developer guide.
 */

/**
 * This function handles the HTTP request and returns the repair information.
 *
 * @param context - The Azure Functions context object.
 * @param req - The HTTP request.
 * @returns A promise that resolves with the HTTP response containing the repair information.
 */
module.exports = async function (context, req) {
  // Check if the request is authorized.
  if (!isApiKeyValid(req)) {
    // Return 401 Unauthorized response.
    return {
      status: 401,
    };
  }

  // Initialize response.
  const res = {
    status: 200,
    body: {
      results: [],
    },
  };

  // Get the assignedTo query parameter.
  const assignedTo = req.query.assignedTo;

  // If the assignedTo query parameter is not provided, return all repair records.
  if (!assignedTo) {
    return res;
  }

  // Get the repair records from the data.json file.
  const repairRecords = require("../repairsData.json");

  // Filter the repair records by the assignedTo query parameter.
  const repairs = repairRecords.filter((item) => {
    const query = assignedTo.trim().toLowerCase();
    const fullName = item.assignedTo.toLowerCase();
    const [firstName, lastName] = fullName.split(" ");
    return fullName === query || firstName === query || lastName === query;
  });

  // Return filtered repair records, or an empty array if no records were found.
  res.body.results = repairs ?? [];
  return res;
};

/**
 * The reason for this implementation is that Azure Function Core Tools does not support authentication when running locally.
 * This template is designed to demonstrate and facilitate local debugging of authentication functionalities in the API-based
 * message extension. Therefore, this approach was taken. If you prefer to leverage the Azure Functions' built-in API key
 * authentication, please refer to https://aka.ms/functionkey for guidance.
 * @param req - The HTTP request.
 */
function isApiKeyValid(req) {
  const apiKey = req.headers["x-api-key"];
  return apiKey === process.env.API_KEY;
}
