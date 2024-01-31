# SPFx FAQ and troubleshooting guide

1. [Failed to scaffold](#scaffold)
2. [Failed to import existing SPFx solution](#import)
3. [Failed to deploy](#deploy)
4. [Add web part using Yeoman SharePoint generator of mismatched version](#addWebPart)

## 1. Failed to scaffold<a name="scaffold"></a>

### Error message
Project creation failed. A possible reason could be from Yeoman SharePoint Generator.

### Remediation
- Check SPFx development environment compatibility.    
  1. Check Node version by running the following command    
      ```
      node --version
      ```
  2. Check NPM version by running the following command
      ```
      npm --version
      ```
  3. Check whether the version of Node and NPM are compatibile with the latest SPFx according to [SharePoint Framework compatibility page](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility#spfx-development-environment-compatibility) and upgrade Node or NPM if needed.
- Or you could try to set up global SPFx development environment by following [Set up your SharePoint Framework development environment](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-development-environment#install-nodejs) and choose to scaffold using the globally installed packages.

## 2. Failed to import existing SPFx solution<a name="import"></a>

### Error message
Failed to retrieve existing SPFx solution information. Please make sure your SPFx solution is valid.

### Remediation

- Check your existing SPFx solution is valid with standard project folder structure. 
  1. Check your web part(s) is(are) located at `.\src\webparts` folder under your selected solution folder.

  2. Check your web part(s) manifest file is(are) located at `.\src\webparts\{webpartName}\{webpartName}WebPart.manifest.json`.

  3. Check your web part(s) manifest file has following properties:

     **id** - The property will be used as `entityId` to construct `staticTabs` in Teams manifest file.

     **preconfiguredEntries** - The property (_preconfiguredEntries[0].title.default_) will be used as `name` to construct `staticTabs` in Teams manifest file. 

- Or you could try to migrate your SPFx solution manually following [Integrate Teams Toolkit with an existing SPFx solution](https://github.com/OfficeDev/TeamsFx/wiki/Integrate-Teams-Toolkit-with-an-existing-SPFx-solution).

## 3. Failed to deploy<a name="deploy"></a>

### Error message
Failed to deploy due to lint errors in gulp bundle task. Example:

```
(×) Error: cli/runNpxCommand failed.
  (×) Error: Script ('npx gulp bundle --ship --no-color') execution error: Warning - lint - src/webparts/helloworld/HelloworldWebPart.ts(95,32): error @typescript-eslint/no-explicit-any: Unexpected any. Specify a different type. 
```

### Remediation

There's a known issue that deploy stage will fail even if there're only lint warnings in log detail. The root cause is that when there're lint errors in your SPFx project, `gulp bundle --ship --no-color` command in deploy stage will fail with exit code 1, but they're printed as warning in log details. See related [GitHub issue](https://github.com/SharePoint/sp-dev-docs/issues/9165) for more details.

You'll need to fix the lint errors or disable related lint rules to continue.

## 4. Add web part using Yeoman SharePoint generator of mismatched version<a name="addWebPart"></a>

To add additional web part in an existing SPFx solution, it is recommended to keep the version of @microsoft/generator that will be use to add web part and the solution version consistent to avoid any further build errors.

### Remediation
- Set up global SPFx dev dependencies     
  1. Check the version of your SPFx solution. You could find it from the value of "version" in `src/.yo-rc.json`.
  2. Install Yeoman SharePoint generator of your solution version
      ```
      npm install @microsoft/generator-sharepoint@{version} --global
      ```
      Note: if you don't have Yeoman installed before, you also need to install Yeoman following [Install Yeoman](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-development-environment#install-yeoman)
  3. Use Teams Toolkit to add web part.
- Or you could continue adding SPFx web part using current Sharepoint generator package and upgrade SPFx solution after the web part is added.
  1. Choose "continue" when prompting to confirm whether to add web part using package of mismatched version.
  2. After the web part is added, you could upgrade your SPFx solution.
     1. Install CLI for Microsoft 365 following [CLI for Microsoft 365](https://pnp.github.io/cli-microsoft365/)
     2. Upgrade the project to the new version.
        1. You could find the new version from the value of dependencies (for example: the version of @microsoft/sp-core-library)in `src/package.json`.
        2. Run upgrade command.
            ```
            m365 spfx project upgrade --toVersion {version} --output md > "upgrade-report.md"
            ```  
            You could learn more about this command from [spfx project upgrade](https://pnp.github.io/cli-microsoft365/cmd/spfx/project/project-upgrade)     
        3. Follow the steps in the generated report to upgrade the project.