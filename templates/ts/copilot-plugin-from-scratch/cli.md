## Try sample with TeamsFx CLI

1. Install [Node.js](https://nodejs.org/en/download/) (Recommend LTS 16.x)
1. To install the TeamsFx CLI, use the npm package manager:
    ```
    npm install -g @microsoft/teamsfx-cli
    ```
1. Create copilot-plugin-tpl project.
    ```
    teamsfx new template copilot-plugin-tpl
    ```
1. Provision the project to Azure.
    ```
    teamsfx provision
    ```
1. Deploy.
    ```
    teamsfx deploy
    ```