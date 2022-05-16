import { app } from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import { teamsDarkTheme, teamsHighContrastTheme, teamsTheme, ThemePrepared } from "@fluentui/react-northstar";

export function useTeams() {
  const [inTeams, setInTeams] = useState<boolean | undefined>(undefined);
  const [theme, setTheme] = useState<ThemePrepared>(teamsTheme);
  const [themeString, setThemeString] = useState<string>("default");

  const themeChangeHandler = (theme: string | undefined) => {
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
