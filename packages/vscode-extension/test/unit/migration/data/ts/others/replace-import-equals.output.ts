import msft = require("@microsoft/teams-js");

msft.app.initialize();

//TODO: Convert callback to promise, for more info, please refer to https://aka.ms/teamsfx-callback-to-promise.
msft.authentication.authenticate();

let context: msft.Context;

let event: msft.pages.config.SaveEvent;
