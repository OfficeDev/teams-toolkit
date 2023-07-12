const restify = require("restify");
const send = require("send");
const fs = require("fs");

//Create HTTP server.
const server = restify.createServer({
  key: process.env.SSL_KEY_FILE ? fs.readFileSync(process.env.SSL_KEY_FILE) : undefined,
  certificate: process.env.SSL_CRT_FILE ? fs.readFileSync(process.env.SSL_CRT_FILE) : undefined,
  formatters: {
    "text/html": function (req, res, body) {
      return body;
    },
  },
});

server.get(
  "/static/*",
  restify.plugins.serveStatic({
    directory: __dirname,
  })
);

server.listen(process.env.port || process.env.PORT || 3333, function () {
  console.log(`\n${server.name} listening to ${server.url}`);
});

// Adding tabs to our app. This will setup routes to various views
// Setup home page
server.get("/", (req, res, next) => {
  send(req, __dirname + "/views/hello.html").pipe(res);
});

// Setup the static tab
server.get("/tab", (req, res, next) => {
  send(req, __dirname + "/views/hello.html").pipe(res);
});
