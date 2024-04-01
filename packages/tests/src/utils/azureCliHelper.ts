// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Executor } from "./executor";
import sql from "mssql";
import * as uuid from "uuid";
import { expect } from "chai";
import { Env } from "../utils/env";

export class AzSqlHelper {
  public resourceGroupName: string;
  public sqlServerName: string;
  public sqlDatabaseName: string;
  public sqlAdmin: string;
  public sqlPassword: string;
  public location: string;
  public storageAccountName: string;
  public storageContainerName: string;
  public sqlCommands: string[];
  public sqlEndpoint: string;
  constructor(
    resourceGroupName: string,
    sqlCommands: string[],
    sqlServerName?: string,
    sqlDatabaseName?: string,
    sqlAdmin?: string,
    sqlPassword?: string,
    location?: string
  ) {
    this.resourceGroupName = resourceGroupName;
    this.sqlServerName =
      sqlServerName || `testsql${Math.floor(Math.random() * 100000)}`;
    this.sqlDatabaseName =
      sqlDatabaseName || `testdb${Math.floor(Math.random() * 100000)}`;
    this.sqlAdmin = sqlAdmin || "Abc123321";
    this.sqlPassword = sqlPassword || "Cab232332" + uuid.v4().substring(0, 6);
    this.location = location || "eastus";
    this.storageAccountName = `teststorage${Math.floor(
      Math.random() * 100000
    )}`;
    this.storageContainerName = `testcontainer${Math.floor(
      Math.random() * 100000
    )}`;
    this.sqlCommands = sqlCommands;
    this.sqlEndpoint = "";
  }

  public async createTable(sqlServerEndpoint: string) {
    // login
    console.log(`Logging in...`);
    const { success: loginSuccess } = await AzSqlHelper.login();
    if (!loginSuccess) return;

    // add firewall rule
    console.log(`Adding firewall rule...`);
    const { success: firewallSuccess } = await this.createFirewallRule();
    expect(firewallSuccess).to.be.true;

    // create database table
    console.log(`Creating database table...`);
    await this.createDatabaseTable(sqlServerEndpoint, this.sqlCommands);
    console.log(`[Success] Database table created`);

    console.log(`Sql created successfully`);
    return true;
  }

  public async createSql() {
    // login
    console.log(`Logging in...`);
    const { success: loginSuccess } = await AzSqlHelper.login();
    if (!loginSuccess) return;

    // create resource group
    console.log("Creating resource group: ", this.resourceGroupName, "...");
    const { success: resourceGroupSuccess } = await this.createResourceGroup();
    expect(resourceGroupSuccess).to.be.true;

    // create sql server
    console.log(
      `Creating sql server: ${this.sqlServerName} in resource group: ${this.resourceGroupName}...`
    );
    const { success: sqlServerSuccess } = await this.createSqlServer();
    expect(sqlServerSuccess).to.be.true;

    // create sql database
    console.log(`Creating sql database: ${this.sqlDatabaseName}...`);
    const { success: sqlDatabaseSuccess } = await this.createSqlDatabase();
    expect(sqlDatabaseSuccess).to.be.true;

    // add firewall rule
    console.log(`Adding firewall rule...`);
    const { success: firewallSuccess } = await this.createFirewallRule();
    expect(firewallSuccess).to.be.true;

    // get sql endpoint
    console.log(`Getting sql endpoint...`);
    const { success: sqlEndpointSuccess, sqlServerEndpoint } =
      await this.getSqlEndpoint();
    expect(sqlEndpointSuccess).to.be.true;

    // create database table
    console.log(`Creating database table...`);
    await this.createDatabaseTable(sqlServerEndpoint, this.sqlCommands);
    console.log(`[Success] Database table created`);

    console.log(`Sql created successfully`);
    return true;
  }

  static async login() {
    const command = `az login --allow-no-subscriptions -u ${Env["azureAccountName"]} -p ${Env["azureAccountPassword"]}`;
    const { success } = await Executor.execute(command, process.cwd());
    if (!success) {
      console.error(`Failed to login`);
      return { success: false };
    }
    // set subscription
    const subscription = Env["azureSubscriptionId"];
    const setSubscriptionCommand = `az account set --subscription ${subscription}`;
    return await Executor.execute(setSubscriptionCommand, process.cwd());
  }

  public async createResourceGroup() {
    const command = `az group create -n ${this.resourceGroupName} -l ${this.location}`;
    return await Executor.execute(command, process.cwd());
  }

  private async createDatabaseTable(endpoint: string, sqlCommands: string[]) {
    try {
      const config: sql.config = {
        user: this.sqlAdmin,
        password: this.sqlPassword,
        server: endpoint,
        database: this.sqlDatabaseName,
        options: {
          encrypt: true,
        },
      };
      const pool = await sql.connect(config);
      console.log("Connected to Azure SQL Database");
      console.log("Creating tables...");
      for (const sqlCommand of sqlCommands) {
        await pool.request().query(sqlCommand);
      }
      console.log("Tables created");
      await pool.close();
      console.log("Connection pool closed");
    } catch (error) {
      console.error("Error connecting to Azure SQL Database:", error);
    }
  }
  private async getSqlEndpoint() {
    const command = `az sql server show -n ${this.sqlServerName} -g ${this.resourceGroupName}`;
    const { success, stdout } = await Executor.execute(command, process.cwd());
    if (!success) return { success: false };
    const sqlServerEndpoint = JSON.parse(stdout).fullyQualifiedDomainName;
    this.sqlEndpoint = sqlServerEndpoint;
    return { success: true, sqlServerEndpoint };
  }

  private async createSqlDatabase() {
    const command = `az sql db create -g ${this.resourceGroupName} -s ${this.sqlServerName} -n ${this.sqlDatabaseName} --service-objective S0`;
    return await Executor.execute(command, process.cwd());
  }

  private async createSqlServer() {
    const command = `az sql server create -l ${this.location} -g ${this.resourceGroupName} -n ${this.sqlServerName} -u ${this.sqlAdmin} -p ${this.sqlPassword}`;
    return await Executor.execute(command, process.cwd());
  }

  private async createFirewallRule() {
    const command2 = `az sql server firewall-rule create -g ${this.resourceGroupName} -s ${this.sqlServerName} -n AllowAllWindowsAzureIps --start-ip-address 0.0.0.0 --end-ip-address 255.255.255.255 `;
    return await Executor.execute(command2, process.cwd());
  }

  static async deleteResourceGroup(rg: string) {
    await AzSqlHelper.login();
    console.log(`Deleting resource group: ${rg}...`);
    const command = `az group delete -n ${rg} -y --no-wait`;
    return await Executor.execute(command, process.cwd());
  }

  static async listResourceGroup(
    prefix: string
  ): Promise<{ success: boolean; stdout: string[] }> {
    const command = `az group list --query "[?starts_with(name, '${prefix}')].name"`;
    const { success, stdout } = await Executor.execute(command, process.cwd());
    if (!success) return { success: false, stdout: [] };
    const resourceGroups = JSON.parse(stdout);
    console.log(resourceGroups);
    return { success: true, stdout: resourceGroups };
  }
}

export class AzServiceBusHelper {
  public resourceGroupName: string;
  public namespaceName: string;
  public connectString: string;
  public queueName: string;
  public location: string;
  constructor(resourceGroupName: string, location?: string) {
    this.resourceGroupName = resourceGroupName;
    this.namespaceName = "MyNameSpace" + uuid.v4().substring(0, 4);
    this.location = location || "westus";
    this.connectString = "";
    this.queueName = "notification-messages";
  }

  public async createServiceBus() {
    // login
    console.log(`Logging in...`);
    const { success: loginSuccess } = await AzServiceBusHelper.login();
    if (!loginSuccess) return;

    // create resource group
    console.log("Creating resource group: ", this.resourceGroupName, "...");
    const { success: resourceGroupSuccess } = await this.createResourceGroup();
    expect(resourceGroupSuccess).to.be.true;

    // create namespace
    console.log(
      `Creating namespace: ${this.namespaceName} in resource group: ${this.resourceGroupName}...`
    );
    const { success: namespaceSuccess } = await this.createNamespace();
    expect(namespaceSuccess).to.be.true;

    // get connection string
    console.log(`Get connection string...`);
    const { success: connectStringSuccess, stdout: connectString } =
      await this.getConnectionString();
    expect(connectStringSuccess).to.be.true;
    const result = connectString.match(/[^"]+/) ?? [];
    console.log("Connect String:", result[0]);
    this.connectString = result[0] ?? "";

    // create queue in namespace
    console.log(`Create queue in namespace...`);
    const { success: queueSuccess } = await this.createQueue();
    expect(queueSuccess).to.be.true;

    console.log(`Service Bus created successfully`);
    return true;
  }

  static async login() {
    const command = `az login --allow-no-subscriptions -u ${Env["azureAccountName"]} -p ${Env["azureAccountPassword"]}`;
    const { success } = await Executor.execute(command, process.cwd());
    if (!success) {
      console.error(`Failed to login`);
      return { success: false };
    }
    // set subscription
    const subscription = Env["azureSubscriptionId"];
    const setSubscriptionCommand = `az account set --subscription ${subscription}`;
    return await Executor.execute(setSubscriptionCommand, process.cwd());
  }

  public async createResourceGroup() {
    const command = `az group create -n ${this.resourceGroupName} -l ${this.location}`;
    return await Executor.execute(command, process.cwd());
  }

  public async createQueue() {
    const command = `az servicebus queue create --resource-group ${this.resourceGroupName} --namespace-name ${this.namespaceName} --name ${this.queueName}
    `;
    return await Executor.execute(command, process.cwd());
  }

  private async getConnectionString() {
    const command = `az servicebus namespace authorization-rule keys list --resource-group ${this.resourceGroupName} --namespace-name ${this.namespaceName} --name RootManageSharedAccessKey --query primaryConnectionString`;
    return await Executor.execute(command, process.cwd());
  }

  private async createNamespace() {
    const command = `az servicebus namespace create --resource-group ${this.resourceGroupName} --name ${this.namespaceName} --location westus`;
    return await Executor.execute(command, process.cwd());
  }
}

export async function cleanRG() {
  const { success, stdout } = await AzSqlHelper.listResourceGroup("fxui");
  for (const rg of stdout) {
    await AzSqlHelper.deleteResourceGroup(rg);
  }
}

// for local test
async function main() {
  const sqlCommands = [
    `CREATE TABLE [TeamPostEntity](
        [PostID] [int] PRIMARY KEY IDENTITY,
        [ContentUrl] [nvarchar](400) NOT NULL,
        [CreatedByName] [nvarchar](50) NOT NULL,
        [CreatedDate] [datetime] NOT NULL,
        [Description] [nvarchar](500) NOT NULL,
        [IsRemoved] [bit] NOT NULL,
        [Tags] [nvarchar](100) NULL,
        [Title] [nvarchar](100) NOT NULL,
        [TotalVotes] [int] NOT NULL,
        [Type] [int] NOT NULL,
        [UpdatedDate] [datetime] NOT NULL,
        [UserID] [uniqueidentifier] NOT NULL
     );`,
    `CREATE TABLE [UserVoteEntity](
      [VoteID] [int] PRIMARY KEY IDENTITY,
      [PostID] [int] NOT NULL,
      [UserID] [uniqueidentifier] NOT NULL
    );`,
  ];
  const sqlHelper = new AzSqlHelper("fxui-rg", sqlCommands);
  await sqlHelper.createSql();

  console.log(`Sql admin: ${sqlHelper.sqlAdmin}`);
  console.log(`Sql password: ${sqlHelper.sqlPassword}`);
  console.log(`Sql endpoint: ${sqlHelper.sqlEndpoint}`);
  console.log(`Sql database name: ${sqlHelper.sqlDatabaseName}`);
}
