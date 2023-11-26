/* This code sample provides a starter kit to implement server side logic for your Teams App in TypeScript,
 * refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference for complete Azure Functions
 * developer guide.
 */

import { Context, HttpRequest } from "@azure/functions";

import repairRecords from "../repairsData.json";

// Define a Response interface.
interface Response {
  status: number;
  body?: {
    results: any[];
  };
}

/**
 * This function handles the HTTP request and returns the repair information.
 *
 * @param {Context} context - The Azure Functions context object.
 * @param {HttpRequest} req - The HTTP request.
 * @returns {Promise<Response>} - A promise that resolves with the HTTP response containing the repair information.
 */
export default async function run(context: Context, req: HttpRequest): Promise<Response> {
  // Check if the request is authorized.
  if (!isApiKeyValid(req)) {
    // Return 401 Unauthorized response.
    return {
      status: 401,
    };
  }

  // Initialize response.
  const res: Response = {
    status: 200,
    body: {
      results: [],
    },
  };

  // Get the assignedTo query parameter.
  const assignedTo = req.query.assignedTo;

  // If the assignedTo query parameter is not provided, return the response.
  if (!assignedTo) {
    return res;
  }

  // Filter the repair information by the assignedTo query parameter.
  const repairs = repairRecords.filter((item) => {
    const fullName = item.assignedTo.toLowerCase();
    const query = assignedTo.trim().toLowerCase();
    const [firstName, lastName] = fullName.split(" ");
    return fullName === query || firstName === query || lastName === query;
  });

  // Return filtered repair records, or an empty array if no records were found.
  res.body.results = repairs ?? [];
  return res;
}

/**
 * Check if the request is authorized.
 * @param {HttpRequest} req - The HTTP request.
 * @returns {boolean} - True if the request is authorized, false otherwise.
 */
function isApiKeyValid(req: HttpRequest): boolean {
  const apiKey = req.headers["x-api-key"];
  return apiKey === process.env.API_KEY;
}
