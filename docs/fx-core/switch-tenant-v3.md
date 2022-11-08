This doc is to help you mitigate the error when the Microsoft 365 tenant of your currently signed-in account does not match with what you previously used. 

# Why
The error may occur when you local debug or kick off provisioning resources in a remote environment but we notice that the Microsoft 365 tenant you are currently using is different from what recorded in .env file. We will not provision AAD or Bot resources in the new tenant by default but would like to ask you to confirm the account and then follow the mitigation steps mentioned below to either fix the wrong account or continue provisioning resources in the new tenant.


# Mitigation
1. Check your Microsoft 365 account.    
    a) If you switched to the account unintentionally , please sign out of the current account and sign in with the correct one. Continue local debugging or provision in remote environemnt.     
    b) If you plan to continue with the new account to provision resources in new tenant, please follow step 2.    
2. To provision resources in new tenant, 
    - Clear the value of following keys in `.env.{env}` file in teamsfx folder. For example, the file would be .env.dev for dev environment,
        -  Clear the value of TEAMS_APP_TENANT_ID in .env.
        - Clear the value of AAD_APP_CLIENT_ID if you need an AAD aap.
        - Clear the value of BOT_ID if your project includes a Bot app.
    - Start local debugging or provision, and Teams Toolkit will provision resources in the new Microsoft 365 tenant.
