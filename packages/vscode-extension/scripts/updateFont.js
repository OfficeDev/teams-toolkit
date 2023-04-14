const svgtofont = require("svgtofont");
const fs = require("fs");
const path = require("path");

async function generateFont() {
  try {
    svgtofont({
      src: path.join(__dirname, "..", "img", "font"),
      dist: path.join(__dirname, "..", "media", "font"),
      fontName: "teamstoolkit",
      startUnicode: 0xe000,
      svgicons2svgfont: {
        fontHeight: 1000,
        normalize: true,
      },
    }).then(() => {
      console.log(`Font created.`);
    });
  } catch (e) {
    console.error("Font creation failed.", e);
  }
}

generateFont();
