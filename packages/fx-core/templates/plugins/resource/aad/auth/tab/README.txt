Enable single sign-on for tab applications
-------------------------
Microsoft Teams provides a mechanism by which an application can obtain the signed-in Teams user token to access Microsoft Graph (and other APIs).
Teams Toolkit facilitates this interaction by abstracting some of the Azure Active Directory flows and integrations behind some simple, high level APIs.
This enables you to add single sign-on (SSO) features easily to your Teams application.

Changes to your project
-------------------------
When you added the SSO feature to your application, Teams Toolkit updated your project to support SSO:
After you successfully added SSO into your project, Teams Toolkit will create and modify some files that helps you implement SSO feature.
1. Create: 'aad.template.json' under 'templates/appPackage'
   - The Azure Active Directory application manifest that is used to register the application with AAD.
2. Modify: 'manifest.template.json' under 'templates/appPackage'
   - An 'webApplicationInfo' object will be added into your Teams app manifest template. This field is required by Teams when enabling SSO.
3. Create: 'Auth/tab'
   - Reference code and a 'README.txt' file. These files are provided for reference. See below for more information.

Update your code to add SSO
-------------------------
As described above, the Teams Toolkit generated some configuration to set up your application for SSO, but you need to update your application business logic to take advantage of the SSO feature as appropriate.

1. Move 'GetUserProfile.razor' file under 'Auth/tab' to 'Components/'.
   - 'GetUserProfile': This file implements a function that uses TeamsFx SDK to call Microsoft Graph API to get user info.
2. Replace the following line: '<AddSSO />' with '<GetUserProfile />' to replace the 'AddSSO' component with 'GetUserProfile' component.

Debug your application
-------------------------
You can debug your application by:

1. Right-click your project and select Teams Toolkit > Prepare Teams app dependencies
2. If prompted, sign in with an M365 account for the Teams organization you want 
to install the app to
3. Press F5, or select the Debug > Start Debugging menu in Visual Studio
4. In the launched browser, select the Add button to load the app in Teams

Teams Toolkit will use the AAD manifest file to register a AAD application registered for SSO.
To learn more about Teams Toolkit local debug functionalities, refer to https://docs.microsoft.com/microsoftteams/platform/toolkit/debug-local.

Customize AAD applications
-------------------------
The AAD manifest allows you to customize various aspects of your application registration. You can update the manifest as needed.
Related Doc: https://docs.microsoft.com/azure/active-directory/develop/reference-app-manifest

Follow https://aka.ms/teamsfx-aad-manifest#how-to-customize-the-aad-manifest-template if you need to include additional API permissions to access your desired APIs.

Follow https://aka.ms/teamsfx-aad-manifest#How-to-view-the-AAD-app-on-the-Azure-portal to view your AAD application in Azure Portal.
