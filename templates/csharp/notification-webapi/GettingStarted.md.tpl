# Welcome to Teams Toolkit!

## Quick Start

1. Press F5, or select the Debug > Start Debugging menu in Visual Studio
2. Teams App Test Tool will be opened in the launched browser 
3. Open Windows PowerShell and post a HTTP request to trigger the notification:

   Invoke-WebRequest -Uri "http://localhost:5130/api/notification" -Method Post
   
## Learn more

New to Teams app development or Teams Toolkit? Learn more about 
Teams app manifests, deploying to the cloud, and more in the documentation 
at https://aka.ms/teams-toolkit-vs-docs

Learn more advanced topic like how to customize your notification bot code in 
tutorials at https://aka.ms/notification-bot-tutorial

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, you can create an issue directly in our GitHub repository: 
https://github.com/OfficeDev/TeamsFx/issues
