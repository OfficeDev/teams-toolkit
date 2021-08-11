import axios from "axios";
import { ConstantString } from "./constants";

export async function checkAzureResourcePermission(
  resourceId: string,
  accessToken: string,
  userObjectId: string
): Promise<string[]> {
  const url = `https://management.azure.com/${resourceId}/providers/Microsoft.Authorization/roleAssignments?api-version=2015-07-01&$filter=assignedTo('{${userObjectId}}')`;
  const userRoles = await axios({
    method: "GET",
    url: url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const userRolesArray: string[] = [];
  for (let i = 0; i < userRoles.data.value.length; i++) {
    const roleDefinitionId = userRoles.data.value[i].properties.roleDefinitionId;

    const roleDefinitionUrl = `https://management.azure.com/${roleDefinitionId}?api-version=2015-07-01`;

    const roleDefinition = await axios({
      method: "GET",
      url: roleDefinitionUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    userRolesArray.push(roleDefinition.data.properties.roleName);
  }

  if (userRolesArray.length === 0) {
    userRolesArray.push(ConstantString.noPermission);
  }

  return userRolesArray;
}
