import * as React from "react";
import * as ReactDOM from "react-dom";
import { IntlProvider } from "react-intl";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import { MemoryRouter, Route } from "react-router-dom";
import { TreeContainerType } from "./treeContainerType";
import { DevelopmentView } from "./developmentView";
import { DeploymentView } from "./deploymentView";

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
      initialEntries={["/development", "/deployment"]}
      initialIndex={containerType === TreeContainerType.Development ? 0 : 1}
    >
      <Route path="/development" component={DevelopmentView} />
      <Route path="/deployment" component={DeploymentView} />
    </MemoryRouter>
  );
}
