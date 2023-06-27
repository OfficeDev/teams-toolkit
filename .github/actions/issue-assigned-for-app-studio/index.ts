import { OctoKit, OctoKitIssue } from '../api/octokit';
import { Action } from '../common/Action';
import { context } from '@actions/github';
import { getRequiredInput, safeLog } from '../common/utils';
import { Octokit } from '@octokit/rest';
import { Issue } from '../api/api';
import { getEmail, setOutput } from '../teamsfx-utils/utils';

const githubToken = getRequiredInput('token');
const regExp = [
	"API call to Developer Portal failed: (.*) API name: (.*), X-Correlation-ID: (.*).",
	"Failed to (.*) teams app in app studio, due to \\d{3}, .*",
];

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
			setOutput("body", `There is a github issue about app studio service  assigned to you: <a> https://github.com/OfficeDev/TeamsFx/issues/${this.issue.number} </a>`);
		} else {
			safeLog(`Issue ${this.issue.number} is not an app studio issue, ignore`);
			return;
		}
	}

	async onTriggered(_: OctoKit) {
		const issueNumber = process.env.ISSUE_NUMBER;
		safeLog(`start manually trigger issue ${issueNumber}`);
		const issue = new OctoKitIssue(githubToken, context.repo, { number: issueNumber });
		const issueContent = await issue.getIssue();
		if (issueContent && issueContent.assignee) {
			await this.onAssigned(issue, issueContent.assignee);
		} else {
			safeLog(`Issue ${issueNumber} is not assigned, ignore`);
		}
	}

	matchAppStudioIssueError(): boolean {
		for (const reg of regExp) {
			const regExp = new RegExp(reg);
			if (regExp.test(this.issue.body)) {
				safeLog(`Issue ${this.issue.number} matched regExp ${reg}`);
				return true;
			}
		}
		return false;
	}

}

new CheckAssignedIssueForAppStudio().run(); // eslint-disable-line
