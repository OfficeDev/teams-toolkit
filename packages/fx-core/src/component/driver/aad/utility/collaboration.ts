import { Context, FxError, M365TokenProvider, Result, err, ok } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { hooks } from "@feathersjs/hooks/lib";
import { AadOwner, ResourcePermission } from "../../../../common/permissionInterface";
import { AadAppClient } from "./aadAppClient";
import { permissionsKeys } from "./constants";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import axios from "axios";
import { HttpClientError, HttpServerError, UnhandledError } from "../../../../error/common";

const EventName = {
  grantPermission: "grant-permission",
  listCollaborator: "list-collaborator",
  checkPermission: "check-permission",
};
const componentName = "fx-resource-aad-app-for-teams";

@Service("aad-collaboration")
export class AadCollaboration {
  private readonly aadAppClient: AadAppClient;

  constructor(m365TokenProvider: M365TokenProvider) {
    this.aadAppClient = new AadAppClient(m365TokenProvider);
  }

  @hooks([addStartAndEndTelemetry(EventName.grantPermission, componentName)])
  public async grantPermission(
    ctx: Context,
    objectId: string,
    userObjectId: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      // const userObjectId = userInfo.aadId;
      await this.aadAppClient.addOwner(objectId, userObjectId);

      const result = [
        {
          name: permissionsKeys.name,
          type: permissionsKeys.type,
          roles: [permissionsKeys.owner],
          resourceId: objectId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.listCollaborator, componentName)])
  public async listCollaborator(
    ctx: Context,
    objectId: string
  ): Promise<Result<AadOwner[], FxError>> {
    try {
      const owners = await this.aadAppClient.getOwners(objectId);
      return ok(owners ?? []);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.checkPermission, componentName)])
  public async checkPermission(
    ctx: Context,
    objectId: string,
    userObjectId: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const owners = await this.aadAppClient.getOwners(objectId);
      const isAadOwner = owners?.find((owner: AadOwner) => owner.userObjectId === userObjectId);

      const result = [
        {
          name: permissionsKeys.name,
          type: permissionsKeys.type,
          roles: isAadOwner ? [permissionsKeys.owner] : [permissionsKeys.noPermission],
          resourceId: objectId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  private handleError(error: any, ctx: Context): FxError {
    if (axios.isAxiosError(error)) {
      const message = JSON.stringify(error.response!.data);
      ctx.logProvider.error(message);
      if (error.response!.status >= 400 && error.response!.status < 500) {
        return new HttpClientError(componentName, message);
      } else {
        return new HttpServerError(componentName, message);
      }
    }

    const message = JSON.stringify(error);
    ctx.logProvider.error(message);
    return new UnhandledError(error as Error, componentName);
  }
}
