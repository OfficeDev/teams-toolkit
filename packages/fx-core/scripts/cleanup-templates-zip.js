// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const fs = require("fs-extra");
const path = require("path");

const languages = ["js", "ts"];

const templates = [
    ["function-base", "default", "function"],
    ["function-triggers", "HTTPTrigger", "function"],
    ["tab", "default", "frontend"],
    ["bot", "default", "bot"],
    ["msgext", "default", "bot"],
    ["bot-msgext", "default", "bot"]
];

for (let lang of languages) {
    for (template of templates) {
        const fileName = `${template[0]}.${lang}.${template[1]}.zip`;
        fs.unlinkSync(path.join(__dirname, "..", "templates", "plugins", "resource", template[2], `${fileName}`));
    }
}
