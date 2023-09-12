import { OctoKit } from '../api/octokit';
import { Action } from '../common/Action';
import { context } from '@actions/github';
import { getRequiredInput, safeLog } from '../common/utils';
import { Octokit as Kit } from '@octokit/rest';
import { DevopsClient } from './azdo';

const token = getRequiredInput('token');
const advancedDays = +getRequiredInput('advanced-days');
const devopsToken = getRequiredInput('devops-token');
const org = getRequiredInput('devops-org');
const projectId = getRequiredInput('devops-projectId');
const owner = context.repo.owner;
const repo = context.repo.repo;
const kit = new Kit({
	auth: token,
});

class CreateMilestone extends Action {
	id = 'CreateMilestone';

	async onTriggered(_: OctoKit) {
		safeLog(`start check and create milestone`);
		const api = new DevopsClient(devopsToken, org, projectId);
		const sprints = await api.queryCurrentAndFutureSprints();
		safeLog(`found ${sprints.length} sprints`);
		const existingMilestones = await getExistingMilestones('CY');
		safeLog(`found ${existingMilestones.length} existing milestones`);
		for (const sprint of sprints) {
			await checkAndCreateMilestone(sprint, existingMilestones);
		}
	}
}

new CreateMilestone().run(); // eslint-disable-line

type MilestoneInfo = {
	title: string;
	due_on?: Date;
};


async function createMilestone(info: MilestoneInfo): Promise<void> {
	await kit.request('POST /repos/{owner}/{repo}/milestones', {
		owner: owner,
		repo: repo,
		title: info.title,
		due_on: info.due_on!.toISOString(),
		description: 'created by action',
	});
}

/**
 * sprint looks like this:
 {
	id: '14c9a845-d6e1-43d7-aeb4-b5884228d996',
	name: '2Wk13 (Sep 10 - Sep 23)',
	path: 'Microsoft Teams Extensibility\\Gallium\\CY23Q3\\2Wk\\2Wk13 (Sep 10 - Sep 23)',
	attributes: {
	  startDate: 2023-09-10T00:00:00.000Z,
	  finishDate: 2023-09-23T00:00:00.000Z,
	  timeFrame: 1
	},
	url: 'https://msazure.visualstudio.com/9660fff2-2363-48b0-9e15-64df2283e932/ebf67970-6944-421e-b763-0f2360dd96b4/_apis/work/teamsettings/iterations/14c9a845-d6e1-43d7-aeb4-b5884228d996'
  } 
 */
async function checkAndCreateMilestone(sprint: any, existingMilestones: any[]): Promise<void> {
	safeLog(`start to check sprint ${sprint.name}`);
	const name = sprint.name;
	const parts = sprint.path.split('\\');
	if (parts.length < 5) {
		safeLog(`invalid sprint path: ${sprint.path}`);
		return;
	}
	const prefix = parts[2];
	const existing = existingMilestones.find((item: { title: string; }) => item.title === name);
	if (existing) {
		safeLog(`milestone ${name} already exists, ignore.`);
		return;
	}
	// CY23Q3-2Wk13 (Sep 10 - Sep 23)
	const milestoneInfo: MilestoneInfo = {
		title: `${prefix}-${name}`,
		due_on: new Date(sprint.attributes.finishDate),
	}
	safeLog(`create milestone ${milestoneInfo.title}`);
	await createMilestone(milestoneInfo);
}
/**
 * milestone structure:
 milestone: {
	  url: string;
	  html_url: string;
	  labels_url: string;
	  id: number;
	  node_id: string;
	  number: number;
	  state: "open" | "closed";
	  title: string;
	  description: string | null;
	  creator: components["schemas"]["simple-user"] | null;
	  open_issues: number;
	  closed_issues: number;
	  created_at: string;
	  updated_at: string;
	  closed_at: string | null;
	  due_on: string | null;
	};
 */
async function getExistingMilestones(prefix: string): Promise<any[]> {
	let resp = await kit.request('GET /repos/{owner}/{repo}/milestones', {
		owner: owner,
		repo: repo,
		direction: 'desc',
		state: 'all',
		per_page: 20,
	});
	const milestones = resp.data.filter(
		(item: { title: string; }) =>
			item.title.includes(prefix) && item.title.includes('-'),
	);
	return milestones;
	// latestInfo.due_on = new Date(milestones[latestIndex].due_on!);
}

