import { app, pages, uninitializeCommunication } from "@microsoft/teams-js";

app.getContext();

//TODO: Convert callback to promise, for more info, please refer to https://aka.ms/teamsfx-callback-to-promise.
//TODO: Change the context interface, for more info, please refer to https://aka.ms/teamsfx-context-mapping.
app.getContext(() => {});

app.initialize();

pages.shareDeepLink();

uninitializeCommunication();
