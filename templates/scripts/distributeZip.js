const { copyFileSync, readdirSync, existsSync } = require("node:fs");
const path = require("path");

const BUILD_PATH = path.join(__dirname, "..", "build");
const destinations = [
  path.join(__dirname, "..", "..", "packages", "fx-core", "templates", "fallback"),
  process.env.TEMPLATE_PATH,
];

destinations.forEach((destination) => {
  if (existsSync(destination)) {
    readdirSync(BUILD_PATH).forEach((file) => {
      console.log(`Copying ${file} to ${destination}`);
      copyFileSync(path.join(BUILD_PATH, file), path.join(destination, path.basename(file)));
    });
  }
});
