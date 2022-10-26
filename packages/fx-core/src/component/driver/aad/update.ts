// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { UpdateAadAppArgs } from "./interface/updateAadAppArgs";
import { Service } from "typedi";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { UpdateAadAppOutput } from "./interface/updateAadAppOutput";
import * as fs from "fs-extra";
import * as path from "path";
import { AadAppClient } from "./utility/aadAppClient";
import axios from "axios";
import { SystemError, UserError, ok, err, FxError, Result } from "@microsoft/teamsfx-api";
import { UnhandledSystemError, UnhandledUserError } from "./error/unhandledError";
import { getUuid } from "../../../common/tools";
import { expandEnvironmentVariable } from "../../utils/common";
import { AadManifestHelper } from "../../resource/aadApp/utils/aadManifestHelper";
import { AADManifest } from "../../resource/aadApp/interfaces/AADManifest";
import { MissingFieldInManifestUserError } from "./error/invalidFieldInManifestError";
import isUUID from "validator/lib/isUUID";
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { getLocalizedString } from "../../../common/localizeUtils";
import { logMessageKeys } from "./utility/constants";

const actionName = "aadApp/update"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/aadapp-update";

// logic from src\component\resource\aadApp\aadAppManifestManager.ts
@Service(actionName) // DO NOT MODIFY the service name
export class UpdateAadAppDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: UpdateAadAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    try {
      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));

      this.validateArgs(args);
      const aadAppClient = new AadAppClient(context.m365TokenProvider);
      const state = this.loadCurrentState();

      const manifestAbsolutePath = this.getAbsolutePath(
        args.manifestTemplatePath,
        context.projectPath
      );
      const manifest = await this.loadManifest(manifestAbsolutePath, state);
      const warningMessage = AadManifestHelper.validateManifest(manifest);
      if (warningMessage) {
        warningMessage.split("\n").forEach((warning) => {
          context.logProvider?.warning(warning);
        });
      }

      if (!manifest.id || !isUUID(manifest.id)) {
        throw new MissingFieldInManifestUserError(actionName, "id", helpLink);
      }

      // MS Graph API does not allow adding new OAuth permissions and pre authorize it within one request
      // So split update AAD app to two requests:
      // 1. If there's preAuthorizedApplications, remove it temporary and update AAD app to create possible new permission
      if (manifest.preAuthorizedApplications && manifest.preAuthorizedApplications.length > 0) {
        const preAuthorizedApplications = manifest.preAuthorizedApplications;
        manifest.preAuthorizedApplications = [];
        await aadAppClient.updateAadApp(manifest);
        manifest.preAuthorizedApplications = preAuthorizedApplications;
      }
      // 2. Update AAD app again with full manifest to set preAuthorizedApplications
      await aadAppClient.updateAadApp(manifest);

      // Output actual manifest to project folder
      const outputFileAbsolutePath = this.getAbsolutePath(args.outputFilePath, context.projectPath);
      await fs.ensureDir(path.dirname(outputFileAbsolutePath));
      await fs.writeFile(outputFileAbsolutePath, JSON.stringify(manifest, null, 4), "utf8");
      context.logProvider?.info(
        getLocalizedString(logMessageKeys.outputAadAppManifest, outputFileAbsolutePath)
      );

      context.logProvider?.info(
        getLocalizedString(logMessageKeys.successExecuteDriver, actionName)
      );

      return ok(
        new Map(
          Object.entries(state) // convert each property to Map item
            .filter((item) => item[1] && item[1] !== "") // do not return Map item that is empty
        )
      );
    } catch (error) {
      if (error instanceof UserError || error instanceof SystemError) {
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, error.displayMessage)
        );
        return err(error);
      }

      if (axios.isAxiosError(error)) {
        const message = JSON.stringify(error.response!.data);
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
        );
        if (error.response!.status >= 400 && error.response!.status < 500) {
          return err(new UnhandledUserError(actionName, message, helpLink));
        } else {
          return err(new UnhandledSystemError(actionName, message));
        }
      }

      const message = JSON.stringify(error);
      context.logProvider?.error(
        getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
      );
      return err(new UnhandledSystemError(actionName, JSON.stringify(error)));
    }
  }

  private validateArgs(args: UpdateAadAppArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.manifestTemplatePath !== "string" || !args.manifestTemplatePath) {
      invalidParameters.push("manifestTemplatePath");
    }

    if (typeof args.outputFilePath !== "string" || !args.outputFilePath) {
      invalidParameters.push("outputFilePath");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
    }
  }

  private loadCurrentState(): UpdateAadAppOutput {
    return {
      AAD_APP_ACCESS_AS_USER_PERMISSION_ID: process.env.AAD_APP_ACCESS_AS_USER_PERMISSION_ID,
    };
  }

  private async loadManifest(
    manifestPath: string,
    state: UpdateAadAppOutput
  ): Promise<AADManifest> {
    let generatedNewPermissionId = false;
    try {
      const manifestTemplate = await fs.readFile(manifestPath, "utf8");
      const permissionIdPlaceholderRegex = /\${{ *AAD_APP_ACCESS_AS_USER_PERMISSION_ID *}}/;

      // generate a new permission id if there's no one in env and manifest needs it
      if (!process.env.AAD_APP_ACCESS_AS_USER_PERMISSION_ID) {
        const matches = permissionIdPlaceholderRegex.exec(manifestTemplate);
        if (matches) {
          const permissionId = getUuid();
          process.env.AAD_APP_ACCESS_AS_USER_PERMISSION_ID = permissionId;
          state.AAD_APP_ACCESS_AS_USER_PERMISSION_ID = permissionId;
          generatedNewPermissionId = true;
        }
      }

      const manifestString = expandEnvironmentVariable(manifestTemplate);
      const manifest: AADManifest = JSON.parse(manifestString);
      AadManifestHelper.processRequiredResourceAccessInManifest(manifest);
      return manifest;
    } finally {
      if (generatedNewPermissionId) {
        // restore environment variable to avoid impact to other code
        delete process.env.AAD_APP_ACCESS_AS_USER_PERMISSION_ID;
      }
    }
  }

  private getAbsolutePath(relativeOrAbsolutePath: string, projectPath: string) {
    return path.isAbsolute(relativeOrAbsolutePath)
      ? relativeOrAbsolutePath
      : path.join(projectPath, relativeOrAbsolutePath);
  }
}
