// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SqlManagementClient, SqlManagementModels } from "@azure/arm-sql";
import axios from "axios";
import { SqlConfig } from "./config";
import { ErrorMessage } from "./errors";
import { Constants } from "./constants";
import { SqlResultFactory } from "./results";
import { PluginContext } from "fx-api";
export class ManagementClient {
    client?: SqlManagementClient;
    config: SqlConfig;
    ctx: PluginContext;

    constructor(ctx: PluginContext, config: SqlConfig) {
        this.ctx = ctx;
        this.config = config;
    }

    async init() {
        const credential = await this.ctx.azureAccountProvider!.getAccountCredentialAsync();
        this.client = new SqlManagementClient(credential!, this.config.azureSubscriptionId);
    }

    async createAzureSQL() {
        const model: SqlManagementModels.Server = {
            location: this.config.location,
            administratorLogin: this.config.admin,
            administratorLoginPassword: this.config.adminPassword,
        };
        try {
            await this.client!.servers.createOrUpdate(this.config.resourceGroup, this.config.sqlServer, model);
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlCreateError.message(this.config.sqlEndpoint, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlCreateError.name, ErrorMessage.SqlCreateError.message(this.config.sqlEndpoint, ErrorMessage.GetDetail), error);
        }
    }

    async existAzureSQL(): Promise<boolean> {
        try {
            const result = await this.client!.servers.checkNameAvailability({ name: this.config.sqlServer });
            if (result.available) {
                return false;
            } else if (result.reason === "Invalid") {
                throw SqlResultFactory.UserError(ErrorMessage.SqlEndpointError.name, ErrorMessage.SqlEndpointError.message(this.config.sqlEndpoint));
            } else {
                return true;
            }
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlCheckError.message(this.config.sqlEndpoint, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlCheckError.name, ErrorMessage.SqlCheckError.message(this.config.sqlEndpoint, ErrorMessage.GetDetail), error);
        }
    }

    async existAadAdmin(): Promise<boolean> {
        try {
            const result = await this.client!.serverAzureADAdministrators.listByServer(this.config.resourceGroup, this.config.sqlServer);
            if (result.find((item: { login: string; }) => item.login === this.config.aadAdmin)) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlCheckAdminError.message(this.config.identity, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlCheckAdminError.name, ErrorMessage.SqlCheckAdminError.message(this.config.identity, ErrorMessage.GetDetail), error);
        }
    }

    async createDatabase() {
        const sku: SqlManagementModels.Sku = {
            name: "Basic"
        };
        const model: SqlManagementModels.Database = {
            location: this.config.location,
            sku:sku
        };
        try {
            await this.client!.databases.createOrUpdate(this.config.resourceGroup, this.config.sqlServer, this.config.databaseName, model);
            // when the request returned, the instance of database may not be ready. Let's wait a moment
            await this.delay(10);
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.DatabaseCreateError.message(this.config.databaseName, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.DatabaseCreateError.name, ErrorMessage.DatabaseCreateError.message(this.config.databaseName, ErrorMessage.GetDetail), error);
        }
    }

    async existDatabase(): Promise<boolean> {
        try {
            const result = await this.client!.databases.listByServer(this.config.resourceGroup, this.config.sqlServer);
            if (result.find((item) => item.name === this.config.databaseName)) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlCheckDBError.message(this.config.databaseName, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlCheckDBError.name, ErrorMessage.SqlCheckDBError.message(this.config.databaseName, ErrorMessage.GetDetail), error);
        }
    }

    async addAADadmin() {
        let model: SqlManagementModels.ServerAzureADAdministrator = {
            tenantId: this.config.tenantId,
            sid: this.config.aadAdminObjectId,
            login: this.config.aadAdmin,
        };
        const tmp: any = model;
        tmp.administratorType = Constants.sqlAdministratorType;
        model = tmp as unknown as SqlManagementModels.ServerAzureADAdministrator;
        try {
            await this.client!.serverAzureADAdministrators.createOrUpdate(this.config.resourceGroup, this.config.sqlServer, model);
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlAddAdminError.message(this.config.aadAdmin, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlAddAdminError.name, ErrorMessage.SqlAddAdminError.message(this.config.aadAdmin, ErrorMessage.GetDetail), error);
        }
    }

    async addAzureFirewallRule() {
        const model: SqlManagementModels.FirewallRule = {
            startIpAddress: Constants.firewall.azureIp,
            endIpAddress: Constants.firewall.azureIp,
        };
        try {
            await this.client!.firewallRules.createOrUpdate(this.config.resourceGroup, this.config.sqlServer, Constants.firewall.azureRule, model);
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlAzureFirwallError.message(this.config.sqlEndpoint, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlAzureFirwallError.name, ErrorMessage.SqlAzureFirwallError.message(this.config.sqlEndpoint, ErrorMessage.GetDetail), error);
        }
    }

    async addLocalFirewallRule() {
        const response = await axios.get(Constants.echoIpAddress);
        const localIp: string = response.data;
        const startIp: string = localIp.substring(0, localIp.lastIndexOf(".")) + ".1";
        const endIp: string = localIp.substring(0, localIp.lastIndexOf(".")) + ".255";
        const model: SqlManagementModels.FirewallRule = {
            startIpAddress: startIp,
            endIpAddress: endIp,
        };
        try {
            await this.client!.firewallRules.createOrUpdate(this.config.resourceGroup, this.config.sqlServer, Constants.firewall.localRule, model);
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlLocalFirwallError.message(this.config.sqlEndpoint, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlLocalFirwallError.name, ErrorMessage.SqlLocalFirwallError.message(this.config.sqlEndpoint, ErrorMessage.GetDetail), error);
        }
    }

    async deleteLocalFirewallRule() {
        try {
            await this.client!.firewallRules.deleteMethod(this.config.resourceGroup, this.config.sqlServer, Constants.firewall.localRule);
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlDeleteLocalFirwallError.message(this.config.sqlEndpoint, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlDeleteLocalFirwallError.name, ErrorMessage.SqlDeleteLocalFirwallError.message(this.config.sqlEndpoint, ErrorMessage.GetDetail), error);
        }
    }

    async delay(s: number) {
        return new Promise(resolve => setTimeout(resolve, s * 1000));
    }
}