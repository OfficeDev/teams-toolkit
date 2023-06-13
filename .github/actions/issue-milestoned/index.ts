import { OctoKit, OctoKitIssue } from '../api/octokit';
import { Action } from '../common/Action';
import { DevopsClient } from '../common/azdo';
import { getRequiredInput, safeLog } from '../common/utils';
import { context } from '@actions/github';
import { getInput } from '@actions/core';

const githubToken = getRequiredInput('token');
const milestonePrefix = getRequiredInput('milestone-prefix');
const devopsToken = getRequiredInput('devops-token');
const org = getRequiredInput('devops-org');
const projectId = getRequiredInput('devops-projectId');
const titlePreix = getRequiredInput('title-prefix');
const bugLabel = getRequiredInput('bug-label');
const bugArea = getRequiredInput('bug-area-path');
const bugIteration = getRequiredInput('bug-iteration-path');
const featureLabel = getInput('feature-label');
const featureArea = getInput('feature-area-path');
const featureIteration = getInput('feature-iteration-path');

class Milestoned extends Action {
	id = 'Milestoned';

	async onMilestoned(issue: OctoKitIssue) {
		const content = await issue.getIssue();
		if (content.milestone?.startsWith(milestonePrefix)) {
			safeLog(`the issue ${content.number} is milestoned with ${content.milestone}`);
			let client = await this.createClient();
			const users = getAccounts;
			let asignee = undefined;
			if (content.assignee && users[content.assignee]) {
				asignee = users[content.assignee];
				asignee += '@microsoft.com';
			}
			const url = this.issueUrl(content.number);
			const title = titlePreix + `[${content.milestone}]` + content.title;
			if (featureLabel && content.labels.includes(featureLabel)) {
				safeLog(`issue labeled with ${featureLabel}. Feature work item will be created.`);
				await client.createFeatureItem(title, asignee, undefined, url);
			} else if (content.labels.includes(bugLabel)) {
				safeLog(`issue labeled with ${bugLabel}. Bug work item will be created.`);
				await client.createBugItem(title, asignee, undefined, url);
			} else {
				safeLog(
					`issue labeled without feature label(${featureLabel}) and bug label(${bugLabel}). Default bug work item will be created.`,
				);
				await client.createBugItem(title, asignee, undefined, url);
			}
			safeLog(`finished to create work item.`);
		} else {
			safeLog(`the issue ${content.number} is not milestoned with prefix ${milestonePrefix}, ignore.`);
		}
	}
	async onTriggered(_: OctoKit) {
		safeLog(`start manually create work item`);
		const issueNumber = +getRequiredInput('issue-number');
		const issue = await new OctoKitIssue(githubToken, context.repo, { number: issueNumber });
		await this.onMilestoned(issue);
	}

	private async createClient() {
		let client = new DevopsClient(
			devopsToken,
			org,
			projectId,
			bugArea,
			bugIteration,
			featureArea,
			featureIteration,
		);
		await client.init();
		return client;
	}

	private issueUrl(id: number) {
		return `https://github.com/${context.repo.owner}/${context.repo.repo}/issues/${id}`;
	}
}

const getAccounts = (() => {
	return fs.readJsonSync(path.join(__dirname, '../..', '.github', 'accounts.json'));
})();

new Milestoned().run(); // eslint-disable-line
