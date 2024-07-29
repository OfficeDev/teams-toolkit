import { OctoKit, OctoKitIssue } from '../api/octokit';
import { Action } from '../common/Action';
import { context } from '@actions/github';
import { getRequiredInput, safeLog } from '../common/utils';
import { Issue } from '../api/api';
import { getEmail, setOutput, getTemplateFromPackageAndConvertToReg } from '../teamsfx-utils/utils';

const githubToken = getRequiredInput('token');

class CheckAssignedIssueForAppStudio extends Action {
	id = 'CheckAssignedIssueForAppStudio';
	issue!: Issue;
	statusCodeIgnoreApiName: string[];

	owner = context.repo.owner;
	repo = context.repo.repo;

	async onAssigned(issueHandler: OctoKitIssue, _assignee: string): Promise<void> {
		this.issue = await issueHandler.getIssue();
		safeLog(`start CheckAssignedIssueForAppStudio for Issue ${this.issue.number}`);
		const isMatched = this.matchAppStudioIssueError();
		if (isMatched) {
			safeLog(`Issue ${this.issue.number} is an app studio issue and set output`);
			const email = getEmail(_assignee);
			if (!email) {
				safeLog(`the assignee ${_assignee} is not associated with email address, ignore.`);
				return;
			}
			setOutput('to', email);
			setOutput('subject', '[Github Issue] app studio service issue assigned to you');
			setOutput("body", `There is a github issue about app studio service assigned to you: <a> https://github.com/OfficeDev/TeamsFx/issues/${this.issue.number} </a>`);
		} else {
			safeLog(`Issue ${this.issue.number} is not an app studio issue, ignore`);
			return;
		}
	}

	async onTriggered(_: OctoKit) {
		const issueNumber = process.env.ISSUE_NUMBER;
		safeLog(`start manually trigger issue ${issueNumber}`);
		const issue = new OctoKitIssue(githubToken, context.repo, { number: parseInt(issueNumber || "0") });
		const issueContent = await issue.getIssue();
		if (issueContent && issueContent.assignee) {
			await this.onAssigned(issue, issueContent.assignee);
		} else {
			safeLog(`Issue ${issueNumber} is not assigned, ignore`);
		}
	}

	matchAppStudioIssueError(): boolean {
		const key = "error.appstudio.apiFailed.telemetry";
		const reg = getTemplateFromPackageAndConvertToReg(key);
		if (!reg) {
			safeLog(`There is template for ${key} in package.nls.json, ignore`);
			return false;
		}
		safeLog(`matching-reg is ${reg}`);
		const regExp = new RegExp(reg);
		if (regExp.test(this.issue.body)) {
			safeLog(`Issue ${this.issue.number} matched regExp ${reg}`);
			return true;
		}
		return false;
	}

}

new CheckAssignedIssueForAppStudio().run(); // eslint-disable-line
