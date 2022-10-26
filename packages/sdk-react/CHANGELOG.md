# 0.1.0

Initial release of the SDK for React Hook.

- Add 3 React Hook functions: useTeamsFx, useGraph and useData

# 2.0.0

2.0.0 is a major version upgrade for TeamsFx SDK for React hooks with many improvements and supports.

## Added
- Add `useTeams` hook, referenced [msteams-react-base-component](https://github.com/wictorwilen/msteams-react-base-component).
- Update to use TeamsFx SDK 2.0, which supports [Teams JS SDK 2.0](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/using-teams-client-sdk?tabs=javascript%2Cmanifest-teams-toolkit).
- Support both CJS and ESM modules now, so that webpack and other tools can do proper tree-shaking and optimizations.