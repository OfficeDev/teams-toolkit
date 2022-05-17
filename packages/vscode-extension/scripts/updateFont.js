const webfont = require("webfont");
const fs = require("fs");
const path = require("path");

async function generateFont() {
  try {
    const result = await webfont.webfont({
      files: "img/font/*.svg",
      filePath: path.join(__dirname, ".."),
      formats: ["woff"],
      startUnicode: 0xe000,
      verbose: true,
      normalize: true,
      sort: false,
      fontHeight: 1000,
    });
    const dest = path.join(__dirname, "..", "media", "font", "teamstoolkit.woff");
    fs.writeFileSync(dest, result.woff, "binary");
    console.log(`Font created at ${dest}`);
  } catch (e) {
    console.error("Font creation failed.", e);
  }
}

generateFont();
