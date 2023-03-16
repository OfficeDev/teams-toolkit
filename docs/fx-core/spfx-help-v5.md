# SPFx FAQ and troubleshooting guide

1. [Failed to scaffold](#scaffold)

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