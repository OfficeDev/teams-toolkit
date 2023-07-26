/* This code sample provides a starter kit to implement server side logic for your Teams App in TypeScript,
 * refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference for complete Azure Functions
 * developer guide.
 */

import { Context, HttpRequest } from "@azure/functions";

// Define a Response interface with a status number and a body object that can contain any key-value pairs.
interface Response {
  status: number;
  body: { [key: string]: any };
}

/**
 * This function handles the HTTP request and returns the repair information.
 *
 * @param {Context} context - The Azure Functions context object.
 * @param {HttpRequest} req - The HTTP request.
 * @returns {Promise<Response>} - A promise that resolves with the HTTP response containing the repair information.
 */
export default async function run(context: Context, req: HttpRequest): Promise<Response> {
  // Initialize response.
  const res: Response = {
    status: 200,
    body: {},
  };

  // Define the repair information object.
  const repairInfo = {
    id: 1,
    title: "Oil change",
    description:
      "Need to drain the old engine oil and replace it with fresh oil to keep the engine lubricated and running smoothly.",
    assignedTo: "Karin Blair",
    date: "2023-05-23",
    image: "https://www.howmuchisit.org/wp-content/uploads/2011/01/oil-change.jpg",
  };

  // Set the response body to the repair information object.
  res.body = repairInfo;
  return res;
}
