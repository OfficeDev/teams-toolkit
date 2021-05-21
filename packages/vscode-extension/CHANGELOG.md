# Changelog

## 2.0.0 - May 25 2021
2.0.0 is a major version upgrade for Teams Toolkit with many new improvements and supports.

Added:
- new design of UI and command palette list
- new getting started guide, samples and doc link from toolkit
- new sign-in experience for M365 and Azure
- new interactive flow for creating new app
- add messaging extension capability to Teams app
- sample codes for in-meeting app.
- support e2e dev experience for tab app hosted by either Azure or SPFx
- support adding backend API (Azure Functions) and SQL DB to tab app
- preview support for tab app, bot app, and messaging extension
- dev environment checking and auto-setup
- cloud provision and deploy for Teams app from treeview UI and command palette
- support simplified auth code and graph client through scaffolding
- Mac/Linux support of new toolkit
- integration with GitHub Codespaces for dev/test

Enhanced:
- improved helloworld app through scaffolding for tab app, bot app, and messaging extension
- imoroved local frontend/backend debugging support for tab app, bot app, and messaging extension
- improved error messages and logging
- improved publish to teams flow

Fixed:
- cumulated bug fixes
## 1.2.3 - April 20 2021
- Add scaffold option for a Teams messaging extension with SSO (Single Sign-on)
## 1.2.2 - April 1 2021
- Increase the timout limit when creating an AAD password for a bot registration.
## 1.2.1 - March 15 2021
- Bug fix for env/manifest file automatic replacements not happening for some scaffolds.
- Bug fix for AAD app creation where consent should be admin and users and not just admin.
## 1.2.0 - March 2021
- Pull scaffolds from public github repository for always up to date content.
- Updated scaffold selection wizard with more details on what is available.
- More scaffolding and language options.
- Publishing package support when manifest.json is updated locally the zip and cloud configuration in App Studio is created/updated.
- New scaffolds repository https://github.com/OfficeDev/Microsoft-Teams-Samples
## 1.1.8 - 9 Dec 2020
- Azure AD single sign-on bug fixes for Group tabs
## 1.1.4 - 1 Dec 2020
- Azure AD single sign-on documentation updates
- Bug fixes
## 1.1.3 - 24 Nov 2020
- Azure AD single sign-on scaffolding for Tab apps
- Download application publishing package from VS Code
- Bug fixes
## 1.1.1 & 1.1.2
- Bug fixes
## 1.1.0 - 27 Oct 2020
- Onboard to the new VS Code auth
- New F5
- Deprecation of .publish folder - all updates you do through App Studio tooling
- Pre 1.1.0 project upgrade to new project format. We detect if they don't have a teamsAppId in the project...and if they have a .publish folder we create an app registration for them and update the project.
- New bot creation wizard updates
- New project creation flow
- Bug fixes
## 1.0.4 - 3 Aug 2020
Publish to your org catalog from the toolkit

## 1.0.2 - 15 Jul 2020
Bug fixes

## 1.0.1 - 10 Jul 2020
Quality improvements

## 1.0.0 - 7 Jul 2020
Bug fixes

## 0.9.6 - 30 June 2020
Added
- A new bot service instance is automatically created in Azure when a bot/messaging extension project is provisioned and requires one.
- Run your project in the Teams client by hitting F5.
## 0.9.5 - 19 May 2020
Extension released in preview.
