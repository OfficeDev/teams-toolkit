// the same as .initialize

import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { TeamsActivityHandler } from "botbuilder";
import { adapter } from "./initialize";

const handler = new TeamsActivityHandler();
const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  await adapter.processActivity(req, context.res as any, async (context) => {
    await handler.run(context);
  });
};

export default httpTrigger;
