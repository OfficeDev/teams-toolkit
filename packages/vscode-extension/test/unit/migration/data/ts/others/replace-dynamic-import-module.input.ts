async function func() {
  const msft = await import("@microsoft/teams-js");

  msft.initialize();

  const initialize = (await import("@microsoft/teams-js")).initialize;

  (await import("@microsoft/teams-js")).initialize();
}
