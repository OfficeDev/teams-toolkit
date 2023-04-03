const { TeamsBot } = require("../teamsBot");
const { notificationApp } = require("./initialize");
const { ResponseWrapper } = require("./responseWrapper");

module.exports = async function (context, req) {
  const res = new ResponseWrapper(context.res);
  const teamsBot = new TeamsBot();
  await notificationApp.requestHandler(req, res, async (context) => {
    await teamsBot.run(context);
  });
  return res.body;
};
