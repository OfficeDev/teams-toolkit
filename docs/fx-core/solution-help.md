## Solution.ProvisionFailure
 
The provision task will fail because of some resources are failed to created. In such a case, you have three choices:

### Option 1 - Rollback and redo provision

You have to delete the resource group created in the previous task manually in [Azure portal](https://ms.portal.azure.com/).

The resource group name can be found in the file: `.fx/states/state.{envName}.json`, you can search key `resourceGroupName`.

### Option 2 - Solve the provision problem, continue to provision in the existing resource group

If you can solve the problems for resource provision, you can manually fix the problem and redo provision. 

The toolkit will create resource in an incremental manner.

### Option 3 - Switch subscription or account and redo provision

If the failure is because of the subscription limitation, you can switch your subscription and redo provision.

Before you switch, don't forget to delete the resource group created in the previous failure task in Azure portal.
