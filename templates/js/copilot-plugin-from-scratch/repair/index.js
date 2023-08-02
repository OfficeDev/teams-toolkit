/* This code sample provides a starter kit to implement server side logic for your Teams App in TypeScript, refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference for complete Azure Functions developer guide.
 */

/**
 * This function handles the HTTP request and returns the repair information.
 *
 * @param context - The Azure Functions context object.
 * @param req - The HTTP request.
 * @returns A promise that resolves with the HTTP response containing the repair information.
 */
module.exports = async function (context, req) {
  // Initialize response.
  const res = {
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
};
