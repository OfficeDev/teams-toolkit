import { OctoKit, OctoKitIssue } from '../api/octokit';
import { Action } from '../common/Action';
import { getRequiredInput, safeLog } from '../common/utils';
import { context } from '@actions/github';
import { getEmail, sendAlert } from '../teamsfx-utils/utils';

const githubToken = getRequiredInput('token');

class Checker extends Action {
	id = 'asignee-account-check';

	async onAssigned(issue: OctoKitIssue, assignee: string) {
		safeLog(`the assignee is ${assignee}`);
		const content = await issue.getIssue();
		const msAccount = getEmail(assignee);
		if (!msAccount) {
			safeLog(`the ${assignee} has no associated Microsoft account.`);
			const subject = '[Github Issue Alert] missing associated email address for assignee';
			const issueLink = `https://github.com/OfficeDev/TeamsFx/issues/${content.number}`;
			const fileLink = "https://github.com/OfficeDev/TeamsFx/blob/dev/.github/accounts.json";
			let message = `<b>${assignee}</b> is not associated with company email. Please check it and update the account mapping in the file <a>${fileLink}</a>. `;
			if (content.number != 0) {
				message += `It is triggered by issue assigned <a>${issueLink}</a>.`;
			}
			safeLog(message);
			sendAlert(subject, message);
		}
	}
	async onTriggered(_: OctoKit) {
		const assignee = process.env.ASSIGNEE!;
		safeLog(`start manually check Microsoft account for github account ${assignee}`);
		const issue = new OctoKitIssue(githubToken, context.repo, { number: 0 });
		await this.onAssigned(issue, assignee);
	}
}

new Checker().run(); // eslint-disable-line
