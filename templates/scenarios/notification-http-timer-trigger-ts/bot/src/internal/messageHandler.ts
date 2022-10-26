import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { bot } from "./initialize";
import { ResponseWrapper } from "./responseWrapper";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<any> {
  const res = new ResponseWrapper(context.res);
  await bot.requestHandler(req, res);
  return res.body;
};

export default httpTrigger;
