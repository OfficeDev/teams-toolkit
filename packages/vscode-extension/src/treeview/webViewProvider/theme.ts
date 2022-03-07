export enum Theme {
  Light = "light",
  Dark = "dark",
  HighContrast = "dark",
}

export function getCurrentTheme(mutation?: any): Theme {
  let currentTheme: Theme = Theme.Dark;

  if (!mutation) {
    return currentTheme;
  }

  switch (mutation.target.classList[0]) {
    case "vscode-light":
      currentTheme = Theme.Light;
      break;
    case "vscode-dark":
      currentTheme = Theme.Dark;
      break;
    case "vscode-contrast":
      currentTheme = Theme.HighContrast;
      break;
  }

  // theme varibale moves to second element in classList after bot creation iframe is rendered
  switch (mutation.target.classList[1]) {
    case "vscode-light":
      currentTheme = Theme.Light;
      break;
    case "vscode-dark":
      currentTheme = Theme.Dark;
      break;
    case "vscode-contrast":
      currentTheme = Theme.HighContrast;
      break;
  }

  return currentTheme;
}
