// https://fluentsite.z22.web.core.windows.net/quick-start
import { Provider, teamsTheme, Loader } from "@fluentui/react-northstar";
import { HashRouter as Router, Redirect, Route } from "react-router-dom";
import { TeamsFxContext, useTeamsFx } from "@microsoft/teamsfx-react";
import Privacy from "./Privacy";
import TermsOfUse from "./TermsOfUse";
import Tab from "./Tab";
import "./App.css";
import TabConfig from "./TabConfig";

/**
 * The main app which handles the initialization and routing
 * of the app.
 */
export default function App() {
  const { teamsfx, error, loading, theme, themeString } = useTeamsFx();
  return (
    <TeamsFxContext.Provider value={{teamsfx, error, loading, theme, themeString}}>
      <Provider theme={theme || teamsTheme} styles={{ backgroundColor: "#eeeeee" }}>
        <Router>
          <Route exact path="/">
            <Redirect to="/tab" />
          </Route>
          {loading ? (
            <Loader style={{ margin: 100 }} />
          ) : (
            <>
              <Route exact path="/privacy" component={Privacy} />
              <Route exact path="/termsofuse" component={TermsOfUse} />
              <Route exact path="/tab" component={Tab} />
              <Route exact path="/config" component={TabConfig} />
            </>
          )}
        </Router>
      </Provider>
      </TeamsFxContext.Provider>
  );
}
