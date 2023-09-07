# SPFx FAQ and troubleshooting guide

1. [Failed to scaffold](#scaffold)
2. [Failed to import existing SPFx solution](#import)
3. [Failed to deploy](#deploy)

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
