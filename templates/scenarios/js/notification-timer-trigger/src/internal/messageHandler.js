const { TeamsBot } = require("../teamsBot");
const { bot } = require("./initialize");
const { ResponseWrapper } = require("./responseWrapper");

module.exports = async function (context, req) {
  const res = new ResponseWrapper(context.res);
  const teamsBot = new TeamsBot();
  await bot.requestHandler(req, res, async (context) => {
    await teamsBot.run(context);
  });
  return res.body;
};
