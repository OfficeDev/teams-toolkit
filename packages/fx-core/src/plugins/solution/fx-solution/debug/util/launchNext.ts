// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as os from "os";
import { HubName, LaunchBrowser } from "../constants";

export function generateConfigurations(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }

  const launchConfigurations: Record<string, unknown>[] = [
    launchRemote(LaunchBrowser.edge, "Edge", edgeOrder),
    launchRemote(LaunchBrowser.chrome, "Chrome", chromeOrder),
  ];

  if (includeFrontend) {
    launchConfigurations.push(attachToFrontend(LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(attachToFrontend(LaunchBrowser.chrome, "Chrome"));
  } else if (includeBot) {
    launchConfigurations.push(launchBot(LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(launchBot(LaunchBrowser.chrome, "Chrome"));
  }

  if (includeBot) {
    launchConfigurations.push(attachToBot());
  }

  if (includeBackend) {
    launchConfigurations.push(attachToBackend());
  }

  return launchConfigurations;
}

export function generateCompounds(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  const launchCompounds: Record<string, unknown>[] = [];
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }

  launchCompounds.push(debug(includeFrontend, includeBackend, includeBot, "Edge", edgeOrder));
  launchCompounds.push(debug(includeFrontend, includeBackend, includeBot, "Chrome", chromeOrder));

  return launchCompounds;
}

export function generateM365Configurations(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  const launchConfigurations: Record<string, unknown>[] = [];

  if (includeFrontend) {
    launchConfigurations.push(attachToFrontendM365(HubName.teams, LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(attachToFrontendM365(HubName.teams, LaunchBrowser.chrome, "Chrome"));
    launchConfigurations.push(attachToFrontendM365(HubName.outlook, LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(
      attachToFrontendM365(HubName.outlook, LaunchBrowser.chrome, "Chrome")
    );
    launchConfigurations.push(attachToFrontendM365(HubName.office, LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(attachToFrontendM365(HubName.office, LaunchBrowser.chrome, "Chrome"));
  } else if (includeBot) {
    launchConfigurations.push(launchBotM365(HubName.teams, LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(launchBotM365(HubName.teams, LaunchBrowser.chrome, "Chrome"));
    launchConfigurations.push(launchBotM365(HubName.outlook, LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(launchBotM365(HubName.outlook, LaunchBrowser.chrome, "Chrome"));
    launchConfigurations.push(launchBotM365(HubName.office, LaunchBrowser.edge, "Edge"));
    launchConfigurations.push(launchBotM365(HubName.office, LaunchBrowser.chrome, "Chrome"));
  }

  if (includeBot) {
    launchConfigurations.push(attachToBot());
  }

  if (includeBackend) {
    launchConfigurations.push(attachToBackend());
  }

  return launchConfigurations;
}

export function generateM365Compounds(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  const launchCompounds: Record<string, unknown>[] = [];
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }

  launchCompounds.push(
    debugM365(includeFrontend, includeBackend, includeBot, HubName.teams, "Edge", edgeOrder)
  );
  launchCompounds.push(
    debugM365(includeFrontend, includeBackend, includeBot, HubName.teams, "Chrome", chromeOrder)
  );
  launchCompounds.push(
    debugM365(includeFrontend, includeBackend, includeBot, HubName.outlook, "Edge", edgeOrder)
  );
  launchCompounds.push(
    debugM365(includeFrontend, includeBackend, includeBot, HubName.outlook, "Chrome", chromeOrder)
  );
  launchCompounds.push(
    debugM365(includeFrontend, includeBackend, includeBot, HubName.office, "Edge", edgeOrder)
  );
  launchCompounds.push(
    debugM365(includeFrontend, includeBackend, includeBot, HubName.office, "Chrome", chromeOrder)
  );

  return launchCompounds;
}

function launchRemote(
  browserType: string,
  browserName: string,
  order: number
): Record<string, unknown> {
  return {
    name: `Launch Remote (${browserName})`,
    type: browserType,
    request: "launch",
    url: "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
    presentation: {
      group: "remote",
      order: order,
    },
  };
}

function attachToFrontend(browserType: string, browserName: string): Record<string, unknown> {
  return {
    name: `Attach to Frontend (${browserName})`,
    type: browserType,
    request: "launch",
    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
    presentation: {
      group: "all",
      hidden: true,
    },
  };
}

function attachToFrontendM365(
  hubName: string,
  browserType: string,
  browserName: string
): Record<string, unknown> {
  return {
    name: `Attach to Frontend in ${hubName} (${browserName})`,
    type: browserType,
    request: "launch",
    url: getFrontendLaunchUrl(hubName),
    presentation: {
      group: "all",
      hidden: true,
    },
  };
}

function attachToBot() {
  return {
    name: "Attach to Bot",
    type: "pwa-node",
    request: "attach",
    port: 9239,
    restart: true,
    presentation: {
      group: "all",
      hidden: true,
    },
  };
}

function attachToBackend(): Record<string, unknown> {
  return {
    name: "Attach to Backend",
    type: "pwa-node",
    request: "attach",
    port: 9229,
    restart: true,
    presentation: {
      group: "all",
      hidden: true,
    },
    internalConsoleOptions: "neverOpen",
  };
}

function launchBot(browserType: string, browserName: string): Record<string, unknown> {
  return {
    name: `Launch Bot (${browserName})`,
    type: browserType,
    request: "launch",
    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
    presentation: {
      group: "all",
      hidden: true,
    },
  };
}

function launchBotM365(
  hubName: string,
  browserType: string,
  browserName: string
): Record<string, unknown> {
  return {
    name: `Launch Bot in ${hubName} (${browserName})`,
    type: browserType,
    request: "launch",
    url: getBotLaunchUrl(hubName),
    presentation: {
      group: "all",
      hidden: true,
    },
  };
}

function debug(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean,
  browserName: string,
  order: number
): Record<string, unknown> {
  const configurations: string[] = [];
  if (includeFrontend) {
    configurations.push(`Attach to Frontend (${browserName})`);
  } else if (includeBot) {
    configurations.push(`Launch Bot (${browserName})`);
  }
  if (includeBot) {
    configurations.push("Attach to Bot");
  }
  if (includeBackend) {
    configurations.push("Attach to Backend");
  }
  return {
    name: `Debug (${browserName})`,
    configurations,
    preLaunchTask: "Pre Debug Check & Start All",
    presentation: {
      group: "all",
      order: order,
    },
    stopAll: true,
  };
}

function debugM365(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean,
  hubName: string,
  browserName: string,
  order: number
): Record<string, unknown> {
  const configurations: string[] = [];
  if (includeFrontend) {
    configurations.push(`Attach to Frontend in ${hubName} (${browserName})`);
  } else if (includeBot) {
    configurations.push(`Launch Bot in ${hubName} (${browserName})`);
  }
  if (includeBot) {
    configurations.push("Attach to Bot");
  }
  if (includeBackend) {
    configurations.push("Attach to Backend");
  }
  return {
    name: `Debug in ${hubName} (${browserName})`,
    configurations,
    preLaunchTask:
      hubName === HubName.teams
        ? "Pre Debug Check & Start All"
        : "Pre Debug Check & Start All & Install App",
    presentation: {
      group: "all",
      order: order,
    },
    stopAll: true,
  };
}

function getFrontendLaunchUrl(hubName: string) {
  if (hubName === HubName.teams) {
    return "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
  } else if (hubName === HubName.outlook) {
    return "https://outlook-sdf.office.com/host/${localTeamsAppInternalId}/index?${account-hint}";
  } else if (hubName === HubName.office) {
    return "https://www.office.com/m365apps/${localTeamsAppInternalId}?auth=2&${account-hint}";
  }
  return "";
}

function getBotLaunchUrl(hubName: string): string {
  if (hubName === HubName.teams) {
    return "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
  } else if (hubName === HubName.outlook) {
    return "https://outlook-sdf.office.com/mail";
  }
  return "";
}
