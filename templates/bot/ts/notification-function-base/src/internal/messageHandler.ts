import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { bot } from "./initialize";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  await bot.requestHandler(req, context.res as any);
};

export default httpTrigger;
