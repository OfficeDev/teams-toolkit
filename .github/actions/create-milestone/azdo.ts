import * as vm from 'azure-devops-node-api';
import * as CoreInterfaces from 'azure-devops-node-api/interfaces/CoreInterfaces';
import * as CoreApi from 'azure-devops-node-api/CoreApi';

export class DevopsClient {
	token: string;
	org: string;
	projectId: string;

    webApi?: vm.WebApi;

	constructor(
		token: string,
		org: string,
		projectId: string,
	) {
		this.token = token;
		this.org = org;
		this.projectId = projectId;
	}

	public async init() {
		let orgUrl = `https://dev.azure.com/${this.org}`;
		this.webApi = await this.getApi(orgUrl);
	}

	private async getApi(serverUrl: string): Promise<vm.WebApi> {
		let authHandler = vm.getHandlerFromToken(this.token);
		let vsts: vm.WebApi = new vm.WebApi(serverUrl, authHandler);
		await vsts.connect();
		return vsts;
	}

	async queryCurrentAndFutureSprints(): Promise<any[]> {
        const workApi = await this.webApi?.getWorkApi();
        const coreApiObject: CoreApi.CoreApi = await this.webApi!.getCoreApi();
        const project: CoreInterfaces.TeamProject = await coreApiObject.getProject(this.projectId);

        const teamContext: CoreInterfaces.TeamContext = {
            project: project.name,
            projectId: project.id,
            team: 'AuthAndData',
        };

		// it can succeed to set timeframe as current, but it will fail to set timeframe as future
		// const iterations = await workApi?.getTeamIterations(teamContext, 'future');

        const allIterations = await workApi?.getTeamIterations(teamContext);
		const res = allIterations?.filter((item) => {
			return item.attributes?.timeFrame != 0
		});
		return res;
    }
}
