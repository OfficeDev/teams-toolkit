import "./App.css";

import { HashRouter as Router, Redirect, Route } from "react-router-dom";

// https://fluentsite.z22.web.core.windows.net/quick-start
import {
  FluentProvider,
  teamsDarkTheme,
  teamsHighContrastTheme,
  teamsLightTheme
} from "@fluentui/react-components";
import { useTeams } from "@microsoft/teamsfx-react";

import { TeamsFxContext } from "./internal/context";
import SampleDashboard from "./views/dashboards/SampleDashboard";
import Privacy from "./views/Privacy";
import TabConfig from "./views/TabConfig";
import TermsOfUse from "./views/TermsOfUse";

/**
 * The main app which handles the initialization and routing
 * of the app.
 */
export default function App() {
  const { themeString } = useTeams({})[0];
  return (
    <TeamsFxContext.Provider value={{ themeString }}>
      <FluentProvider
        id="fluent-provider"
        theme={
          themeString === "dark"
            ? teamsDarkTheme
            : themeString === "contrast"
            ? teamsHighContrastTheme
            : teamsLightTheme
        }
      >
        <Router>
          <Route exact path="/">
            <Redirect to="/tab" />
          </Route>
          {
            <>
              <Route exact path="/privacy" component={Privacy} />
              <Route exact path="/termsofuse" component={TermsOfUse} />
              <Route exact path="/tab" component={SampleDashboard} />
              <Route exact path="/config" component={TabConfig} />
            </>
          }
        </Router>
      </FluentProvider>
    </TeamsFxContext.Provider>
  );
}
