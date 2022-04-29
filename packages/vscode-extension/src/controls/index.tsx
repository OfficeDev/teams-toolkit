import * as React from "react";
import * as ReactDOM from "react-dom";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import SampleGallery from "./SampleGallery";
import Survey from "./Survey";
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

  return (
    <MemoryRouter
      initialEntries={["/sample-gallery", "/survey"]}
      initialIndex={panelType === PanelType.SampleGallery ? 0 : 1}
    >
      <Route path="/sample-gallery" component={SampleGallery} />
      <Route path="/survey" component={Survey} />
    </MemoryRouter>
  );
}
