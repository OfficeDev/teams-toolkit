import "./App.css";

import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";

// https://fluentsite.z22.web.core.windows.net/quick-start
import {
  FluentProvider,
  Spinner,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  tokens,
} from "@fluentui/react-components";
import { useTeamsUserCredential } from "@microsoft/teamsfx-react";

import SampleDashboard from "./dashboards/SampleDashboard";
import Privacy from "./Privacy";
import TabConfig from "./TabConfig";
import TermsOfUse from "./TermsOfUse";
import { TeamsFxContext } from "./internal/context";

/**
 * The main app which handles the initialization and routing
 * of the app.
 */
export default function App() {
  const { loading, themeString, teamsUserCredential } = useTeamsUserCredential({
    initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
    clientId: process.env.REACT_APP_CLIENT_ID,
  });
  return (
    <TeamsFxContext.Provider value={{ themeString, teamsUserCredential }}>
      <FluentProvider
        id="fluent-provider"
        theme={
          themeString === "dark"
            ? teamsDarkTheme
            : themeString === "contrast"
            ? teamsHighContrastTheme
            : teamsLightTheme
        }
        style={{
          height: "100vh",
          background: tokens.colorNeutralBackground3,
        }}
      >
        <Router>
          {loading ? (
            <Spinner id="spinner" />
          ) : (
            <Routes>
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/termsofuse" element={<TermsOfUse />} />
              <Route path="/tab" element={<SampleDashboard />} />
              <Route path="/config" element={<TabConfig />} />
              <Route path="*" element={<Navigate to={"/tab"} />}></Route>
            </Routes>
          )}
        </Router>
      </FluentProvider>
    </TeamsFxContext.Provider>
  );
}
