import msft = require("@microsoft/teams-js");

msft.initialize();

msft.authentication.authenticate();

let context: msft.Context;

let event: msft.settings.SaveEvent;
