const { bot } = require("./initialize");
const { ResponseWrapper } = require("./responseWrapper");

module.exports = async function (context, req) {
  const res = new ResponseWrapper(context.res);
  await bot.requestHandler(req, res);
  return res.body;
};
