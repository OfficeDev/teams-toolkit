const { bot } = require("./initialize");

module.exports = async function (context, req) {
  await bot.requestHandler(req, context.res);
};
