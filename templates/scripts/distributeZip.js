const { copyFileSync, readdirSync, existsSync, mkdirSync } = require("node:fs");
const path = require("path");

const BUILD_PATH = path.join(__dirname, "..", "build");
const destinations = [
  path.join(__dirname, "..", "..", "packages", "fx-core", "templates", "fallback"),
];

destinations.forEach((destination) => {
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }
  readdirSync(BUILD_PATH).forEach((file) => {
    console.log(`Copying ${file} to ${destination}`);
    copyFileSync(path.join(BUILD_PATH, file), path.join(destination, path.basename(file)));
  });
});
