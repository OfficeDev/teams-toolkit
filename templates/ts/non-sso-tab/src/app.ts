import express from "express";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

const app = express();

const sslOptions = {
  key: process.env.SSL_KEY_FILE ? fs.readFileSync(process.env.SSL_KEY_FILE) : undefined,
  cert: process.env.SSL_CRT_FILE ? fs.readFileSync(process.env.SSL_CRT_FILE) : undefined,
};

// Adding tabs to our app. This will setup routes to various views
// Setup home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "hello.html"));
});

// Setup the static tab
app.get("/tab", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "hello.html"));
});

// Create HTTP server.
// Start server
const port = process.env.port || process.env.PORT || 3333;

// Serve static files under /static
app.use("/static", express.static(path.join(__dirname, "static")));

if (sslOptions.key && sslOptions.cert) {
  https.createServer(sslOptions, app).listen(port, () => {
    console.log(`Express server listening on port ${port}`);
  });
} else {
  app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
  });
}
