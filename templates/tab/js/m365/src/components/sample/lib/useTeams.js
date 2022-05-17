import { app } from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import { teamsDarkTheme, teamsHighContrastTheme, teamsTheme } from "@fluentui/react-northstar";

export function useTeams() {
  const [inTeams, setInTeams] = useState(undefined);
  const [theme, setTheme] = useState(teamsTheme);
  const [themeString, setThemeString] = useState("default");

  const themeChangeHandler = (theme) => {
    setThemeString(theme || "default");
    switch (theme) {
        case "dark":
            setTheme(teamsDarkTheme);
            break;
        case "contrast":
            setTheme(teamsHighContrastTheme);
            break;
        case "default":
        default:
            setTheme(teamsTheme);
    }
  };
  
  useEffect(() => {
    app.initialize().then(() => {
      setInTeams(true);
      app.registerOnThemeChangeHandler(themeChangeHandler);
    }).catch(() => {
      setInTeams(false);
    })
  }, []);

  return [ { inTeams, theme, themeString } ];
}
