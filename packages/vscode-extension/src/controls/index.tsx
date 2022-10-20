import * as React from "react";
import * as ReactDOM from "react-dom";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import SampleGallery from "./SampleGallery";
import Survey from "./Survey";
import RespondToCardActions from "./webviewDocs/respondToCardActions";
import WorkflowBot from "./webviewDocs/workflowBot";
import { PanelType } from "./PanelType";

const language = "en";

ReactDOM.render(
  <IntlProvider locale={language}>
    <App />
  </IntlProvider>,
  document.getElementById("root") as HTMLElement
);

export default function App(props: any) {
  // Initializing the office-ui-fabric-icons here to avoid multiple initializations in every component.
  initializeIcons();

  let initialIndex = 0;
  if (panelType === PanelType.Survey) {
    initialIndex = 1;
  } else if (panelType === PanelType.RespondToCardActions) {
    initialIndex = 2;
  }
  return (
    <MemoryRouter
      initialEntries={["/sample-gallery", "/survey", "/respond-to-card-actions"]}
      initialIndex={initialIndex}
    >
      <Route path="/sample-gallery" component={SampleGallery} />
      <Route path="/survey" component={Survey} />
      <Route path="/respond-to-card-actions" component={WorkflowBot} />
    </MemoryRouter>
  );
}
