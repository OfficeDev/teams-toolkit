import * as React from "react";
import * as ReactDOM from "react-dom";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route } from "react-router-dom";

import { initializeIcons } from "@fluentui/react/lib/Icons";

import { PanelType } from "./PanelType";
import SampleGallery from "./SampleGallery";
import Survey from "./Survey";
import AccountHelp from "./webviewDocs/accountHelp";
import FunctionBasedNotificationBot from "./webviewDocs/functionBasedNotificationBot";
import RestifyServerNotificationBot from "./webviewDocs/restifyServerNotificationBot";
import WorkflowBot from "./webviewDocs/workflowBot";

const language = "en";

ReactDOM.render(
  <IntlProvider locale={language}>
    <App />
  </IntlProvider>,
  document.getElementById("root") as HTMLElement
);

function App(props: any) {
  // Initializing the office-ui-fabric-icons here to avoid multiple initializations in every component.
  initializeIcons();

  let initialIndex = 0;
  if (panelType === PanelType.Survey) {
    initialIndex = 1;
  } else if (panelType === PanelType.RespondToCardActions) {
    initialIndex = 2;
  } else if (panelType === PanelType.AccountHelp) {
    initialIndex = 3;
  } else if (panelType === PanelType.FunctionBasedNotificationBotReadme) {
    initialIndex = 4;
  } else if (panelType === PanelType.RestifyServerNotificationBotReadme) {
    initialIndex = 5;
  }
  return (
    <MemoryRouter
      initialEntries={[
        "/sample-gallery",
        "/survey",
        "/respond-to-card-actions",
        "/account-help",
        "/function-based-notification-bot",
        "/restify-server-notification-bot",
      ]}
      initialIndex={initialIndex}
    >
      <Route path="/sample-gallery" component={SampleGallery} />
      <Route path="/survey" component={Survey} />
      <Route path="/respond-to-card-actions" component={WorkflowBot} />
      <Route path="/account-help" component={AccountHelp} />
      <Route path="/function-based-notification-bot" component={FunctionBasedNotificationBot} />
      <Route path="/restify-server-notification-bot" component={RestifyServerNotificationBot} />
    </MemoryRouter>
  );
}
