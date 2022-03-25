# SPFx prerequisites troubleshoot

## Overview

For SPFx app, Teams Toolkit uses Yeoman Generator for scaffolding. This requires both [Yeoman Generator](https://yeoman.io/) and the correct SPFx generator version to be installed.

As the default behavior, Teams Toolkit will try to install them locally under `HOME/.fx`. Should the installation fail, we would revert to use your globally installed ones.

## Remediation Steps
### Step 1: Disable Prerequisite Checker 

Go to _Manage > Extension > Teams Toolkit > SPFx Prerequisite Check_

    ![image](../images/fx-core/spfx/setting.png)

And uncheck these 2: 
- Ensure Yeoman Generator is installed 
- Ensure SPFx generator is installed 


## Step 2: Manually install or upgrade
In the output message in VSC, you should see the current version that Teams Toolkit supports:

    ![image](../images/fx-core/spfx/output.png)

In the following, navigate to **your applicable sceanrio**:

### If you have Yeoman Generator installed and have the correct SPFx generator version 

Teams Toolkit will use them for scaffolding, there's no further action that needs to be taken now. You can now retry creating a new SPFx Teams app. 

### If no Yeoman Generator is installed in your system

1. Run this any place in a terminal: 

```sh
npm install --global yo
```

2. Install the SPFx generator version that Teams Toolkit supports, say `1.14`: 

```sh
npm install @microsoft/generator-sharepoint@1.14 -g
```

 
### If you have Yeoman Generator installed but no SPFx generator

Install the SPFx generator version that Teams Toolkit supports, say `1.14`: 

```sh
npm install @microsoft/generator-sharepoint@1.14 -g
```

### If you have SPFx generator installed but it's not the correct version

1. If the global version is higher than the supported version

You can continue with your currently installed version but please note that some of the latest features might not be supported in Teams Toolkit. Teams Toolkit supports (insert version) in this release. 

2. If the global version is lower than supported
Install the SPFx generator version that Teams Toolkit supports, say `1.14`: 

```sh
npm install @microsoft/generator-sharepoint@1.14 -g
```