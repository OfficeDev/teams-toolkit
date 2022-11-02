# TeamsFx Run Utilities
Provide the utilities to run TeamsFx project locally.

## Getting started
### Install the `@microsoft/teamsfx-run-utils` package
`npm install @microsoft/teamsfx-run-utils`

### Load environment variables
```javascript
const utils = require("@microsoft/teamsfx-run-utils");

const projectPath = "/path/to/teamsfx/project";
const envPath = "/path/to/.env/file";
const envs = await utils.loadEnv(projectPath, envPath);
```