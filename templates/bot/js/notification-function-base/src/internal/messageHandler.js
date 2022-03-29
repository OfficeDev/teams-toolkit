// the same as .initialize

const { TeamsActivityHandler } = require("botbuilder");
const { adapter } = require("./initialize");

const handler = new TeamsActivityHandler();
module.exports = async function (context, req) {
  await adapter.processActivity(req, context.res, async (context) => {
    await handler.run(context);
  });
};
