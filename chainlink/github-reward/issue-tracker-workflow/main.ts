import {
	bytesToHex,
	type CronPayload,
	cre,
	encodeCallMsg,
	getNetwork,
	type HTTPSendRequester,
	hexToBase64,
	LAST_FINALIZED_BLOCK_NUMBER,
	Runner,
	type Runtime,
	TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress, keccak256, encodePacked } from 'viem'
import { z } from 'zod'

// ABI for IssueTracker contract
const IssueTrackerABI = [
	{
		inputs: [
			{ internalType: 'string', name: 'owner', type: 'string' },
			{ internalType: 'string', name: 'repo', type: 'string' },
			{ internalType: 'uint256', name: 'issueNumber', type: 'uint256' },
		],
		name: 'registerIssue',
		outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'bytes32', name: 'issueId', type: 'bytes32' },
			{ internalType: 'address', name: 'contributor', type: 'address' },
		],
		name: 'addContributor',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'bytes32', name: 'issueId', type: 'bytes32' },
			{ internalType: 'address[]', name: 'contributors', type: 'address[]' },
		],
		name: 'addContributors',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'string', name: 'owner', type: 'string' },
			{ internalType: 'string', name: 'repo', type: 'string' },
			{ internalType: 'uint256', name: 'issueNumber', type: 'uint256' },
		],
		name: 'generateIssueId',
		outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes32', name: 'issueId', type: 'bytes32' }],
		name: 'closeIssue',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes32', name: 'issueId', type: 'bytes32' }],
		name: 'getIssue',
		outputs: [
			{ internalType: 'string', name: 'owner', type: 'string' },
			{ internalType: 'string', name: 'repo', type: 'string' },
			{ internalType: 'uint256', name: 'issueNumber', type: 'uint256' },
			{ internalType: 'uint256', name: 'totalFunding', type: 'uint256' },
			{ internalType: 'bool', name: 'isClosed', type: 'bool' },
			{ internalType: 'uint256', name: 'contributorCount', type: 'uint256' },
		],
		stateMutability: 'view',
		type: 'function',
	},
] as const

const configSchema = z.object({
	schedule: z.string(),
	githubApiUrl: z.string(),
	githubToken: z.string(),
	repositories: z.array(
		z.object({
			owner: z.string(),
			repo: z.string(),
		}),
	),
	evms: z.array(
		z.object({
			issueTrackerAddress: z.string(),
			chainSelectorName: z.string(),
			gasLimit: z.string(),
		}),
	),
	// Mapping from GitHub username to Ethereum address
	contributorMapping: z.record(z.string(), z.string()).optional(),
})

type Config = z.infer<typeof configSchema>

interface GitHubIssue {
	id: number
	number: number
	title: string
	state: 'open' | 'closed'
	user: {
		login: string
	}
	closed_at: string | null
	closed_by: {
		login: string
	} | null
}

interface GitHubPullRequest {
	id: number
	number: number
	state: string
	merged: boolean
	merged_at: string | null
	user: {
		login: string
	}
	head: {
		sha: string
	}
}

interface GitHubIssueEvent {
	id: number
	event: string
	actor: {
		login: string
	}
	created_at: string
}

// Utility function to safely stringify objects with bigints
const safeJsonStringify = (obj: any): string =>
	JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2)

// Fetch closed issues from GitHub
const fetchClosedIssues = async (
	sendRequester: HTTPSendRequester,
	config: Config,
	owner: string,
	repo: string,
): Promise<GitHubIssue[]> => {
	const url = `${config.githubApiUrl}/repos/${owner}/${repo}/issues?state=closed&per_page=100&sort=updated&direction=desc`
	
	const response = sendRequester.sendRequest({
		method: 'GET',
		url: url,
		headers: {
			Authorization: `Bearer ${config.githubToken}`,
			Accept: 'application/vnd.github.v3+json',
		},
	}).result()

	if (response.statusCode !== 200) {
		throw new Error(`GitHub API request failed with status: ${response.statusCode}`)
	}

	const responseText = Buffer.from(response.body).toString('utf-8')
	const issues: GitHubIssue[] = JSON.parse(responseText)

	// Filter out pull requests (they have pull_request field)
	return issues.filter((issue: any) => !issue.pull_request)
}

// Fetch pull requests that closed an issue
const fetchClosingPRs = async (
	sendRequester: HTTPSendRequester,
	config: Config,
	owner: string,
	repo: string,
	issueNumber: number,
): Promise<GitHubPullRequest[]> => {
	const url = `${config.githubApiUrl}/repos/${owner}/${repo}/issues/${issueNumber}/events`
	
	const response = sendRequester.sendRequest({
		method: 'GET',
		url: url,
		headers: {
			Authorization: `Bearer ${config.githubToken}`,
			Accept: 'application/vnd.github.v3+json',
		},
	}).result()

	if (response.statusCode !== 200) {
		throw new Error(`GitHub API request failed with status: ${response.statusCode}`)
	}

	const responseText = Buffer.from(response.body).toString('utf-8')
	const events: GitHubIssueEvent[] = JSON.parse(responseText)

	// Find "closed" events
	const closedEvents = events.filter((event) => event.event === 'closed')
	
	if (closedEvents.length === 0) {
		return []
	}

	// Fetch PRs that might have closed this issue
	const prsUrl = `${config.githubApiUrl}/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`
	const prsResponse = sendRequester.sendRequest({
		method: 'GET',
		url: prsUrl,
		headers: {
			Authorization: `Bearer ${config.githubToken}`,
			Accept: 'application/vnd.github.v3+json',
		},
	}).result()

	if (prsResponse.statusCode !== 200) {
		return []
	}

	const prsText = Buffer.from(prsResponse.body).toString('utf-8')
	const allPRs: GitHubPullRequest[] = JSON.parse(prsText)

	// Find PRs that were merged around the time the issue was closed
	const closedEvent = closedEvents[0]
	const closedTime = new Date(closedEvent.created_at).getTime()

	// Get PRs that mention this issue in their body/title or were merged around the same time
	const closingPRs = allPRs.filter((pr) => {
		if (!pr.merged || !pr.merged_at) return false
		const mergedTime = new Date(pr.merged_at).getTime()
		const timeDiff = Math.abs(mergedTime - closedTime)
		// PR merged within 1 hour of issue being closed
		return timeDiff < 3600000
	})

	return closingPRs
}

// Get contributor addresses from GitHub usernames
const getContributorAddresses = (
	config: Config,
	usernames: string[],
): Address[] => {
	const addresses: Address[] = []

	for (const username of usernames) {
		if (config.contributorMapping && config.contributorMapping[username]) {
			addresses.push(config.contributorMapping[username] as Address)
		} else {
			// If no mapping, skip (or you could implement a registry lookup)
			console.warn(`No address mapping for GitHub user: ${username}`)
		}
	}

	return addresses
}

// Register issue on-chain
const registerIssueOnChain = (
	runtime: Runtime<Config>,
	evmConfig: Config['evms'][0],
	owner: string,
	repo: string,
	issueNumber: number,
): string => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	// Encode the contract call data for registerIssue
	const callData = encodeFunctionData({
		abi: IssueTrackerABI,
		functionName: 'registerIssue',
		args: [owner, repo, BigInt(issueNumber)],
	})

	// Generate report using consensus capability
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(callData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.issueTrackerAddress as Address,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result()

	const txStatus = resp.txStatus

	if (txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to register issue: ${resp.errorMessage || txStatus}`)
	}

	const txHash = resp.txHash || new Uint8Array(32)
	runtime.log(`Issue registered at txHash: ${bytesToHex(txHash)}`)

	// Generate issue ID (same as contract does)
	return bytesToHex(keccak256(encodePacked(['string', 'string', 'uint256'], [owner, repo, BigInt(issueNumber)])))
}

// Add contributors to issue on-chain
const addContributorsOnChain = (
	runtime: Runtime<Config>,
	evmConfig: Config['evms'][0],
	issueId: string,
	contributors: Address[],
): void => {
	if (contributors.length === 0) {
		return
	}

	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	// Encode the contract call data for addContributors
	const callData = encodeFunctionData({
		abi: IssueTrackerABI,
		functionName: 'addContributors',
		args: [issueId, contributors],
	})

	// Generate report using consensus capability
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(callData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.issueTrackerAddress as Address,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result()

	const txStatus = resp.txStatus

	if (txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to add contributors: ${resp.errorMessage || txStatus}`)
	}

	const txHash = resp.txHash || new Uint8Array(32)
	runtime.log(`Contributors added at txHash: ${bytesToHex(txHash)}`)
}

// Close issue on-chain
const closeIssueOnChain = (
	runtime: Runtime<Config>,
	evmConfig: Config['evms'][0],
	issueId: string,
): void => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	// Encode the contract call data for closeIssue
	const callData = encodeFunctionData({
		abi: IssueTrackerABI,
		functionName: 'closeIssue',
		args: [issueId],
	})

	// Generate report using consensus capability
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(callData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.issueTrackerAddress as Address,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result()

	const txStatus = resp.txStatus

	if (txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to close issue: ${resp.errorMessage || txStatus}`)
	}

	const txHash = resp.txHash || new Uint8Array(32)
	runtime.log(`Issue closed at txHash: ${bytesToHex(txHash)}`)
}

// Check if issue is already registered on-chain
const isIssueRegistered = (
	runtime: Runtime<Config>,
	evmConfig: Config['evms'][0],
	issueId: string,
): boolean => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	const callData = encodeFunctionData({
		abi: IssueTrackerABI,
		functionName: 'getIssue',
		args: [issueId],
	})

	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.issueTrackerAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const result = decodeFunctionResult({
		abi: IssueTrackerABI,
		functionName: 'getIssue',
		data: bytesToHex(contractCall.data),
	})

	// If issueNumber is 0, issue is not registered
	return result.issueNumber !== 0n
}

// Main workflow function
const trackIssues = (runtime: Runtime<Config>): string => {
	runtime.log('Starting issue tracking workflow')

	const httpCapability = new cre.capabilities.HTTPClient()
	const evmConfig = runtime.config.evms[0]

	let processedCount = 0

	for (const repo of runtime.config.repositories) {
		runtime.log(`Processing repository: ${repo.owner}/${repo.repo}`)

		try {
			// Fetch closed issues
			const closedIssues = httpCapability
				.sendRequest(runtime, (sendRequester) =>
					fetchClosedIssues(sendRequester, runtime.config, repo.owner, repo.repo),
				)(runtime.config)
				.result()

			runtime.log(`Found ${closedIssues.length} closed issues`)

			for (const issue of closedIssues) {
				try {
					// Generate issue ID
					const issueId = bytesToHex(keccak256(
						encodePacked(['string', 'string', 'uint256'], [repo.owner, repo.repo, BigInt(issue.number)]),
					))

					// Check if already registered
					const registered = isIssueRegistered(runtime, evmConfig, issueId)
					
					if (!registered) {
						// Register issue
						runtime.log(`Registering issue #${issue.number} from ${repo.owner}/${repo.repo}`)
						registerIssueOnChain(runtime, evmConfig, repo.owner, repo.repo, issue.number)
						processedCount++
					}

					// If issue is closed, find contributors and close on-chain
					if (issue.state === 'closed' && issue.closed_at) {
						// Fetch PRs that closed this issue
						const closingPRs = httpCapability
							.sendRequest(runtime, (sendRequester) =>
								fetchClosingPRs(
									sendRequester,
									runtime.config,
									repo.owner,
									repo.repo,
									issue.number,
								),
							)(runtime.config)
							.result()

						if (closingPRs.length > 0) {
							// Extract contributor usernames
							const contributorUsernames = closingPRs
								.map((pr) => pr.user.login)
								.filter((username, index, self) => self.indexOf(username) === index) // unique

							// Get contributor addresses
							const contributorAddresses = getContributorAddresses(
								runtime.config,
								contributorUsernames,
							)

							if (contributorAddresses.length > 0) {
								runtime.log(
									`Adding ${contributorAddresses.length} contributors to issue #${issue.number}`,
								)
								addContributorsOnChain(runtime, evmConfig, issueId, contributorAddresses)
							}

							// Close issue on-chain
							runtime.log(`Closing issue #${issue.number} on-chain`)
							closeIssueOnChain(runtime, evmConfig, issueId)
						}
					}
				} catch (error) {
					runtime.log(`Error processing issue #${issue.number}: ${error}`)
					// Continue with next issue
				}
			}
		} catch (error) {
			runtime.log(`Error processing repository ${repo.owner}/${repo.repo}: ${error}`)
			// Continue with next repository
		}
	}

	return `Processed ${processedCount} issues`
}

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	runtime.log('Running CronTrigger for issue tracking')
	return trackIssues(runtime)
}

const initWorkflow = (config: Config) => {
	const cronTrigger = new cre.capabilities.CronCapability()

	return [
		cre.handler(
			cronTrigger.trigger({
				schedule: config.schedule,
			}),
			onCronTrigger,
		),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}

main()

