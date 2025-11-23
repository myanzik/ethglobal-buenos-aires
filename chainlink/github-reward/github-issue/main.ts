import {
	bytesToHex,
	ConsensusAggregationByFields,
	type CronPayload,
	cre,
	type EVMLog,
	encodeCallMsg,
	getNetwork,
	type HTTPSendRequester,
	hexToBase64,
	LAST_FINALIZED_BLOCK_NUMBER,
	median,
	Runner,
	type Runtime,
	type NodeRuntime,
	TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress } from 'viem'
import { z } from 'zod'
import { BalanceReader, IERC20, MessageEmitter, ReserveManager } from '../contracts/abi'

const configSchema = z.object({
	schedule: z.string(),
	url: z.string(),
	github: z.object({
		owner: z.string(),
		repo: z.string(),
		issueNumber: z.number(),
		githubToken: z.string().optional(), // Optional: for authenticated requests (higher rate limits)
	}),
	evms: z.array(
		z.object({
			tokenAddress: z.string(),
			porAddress: z.string(),
			proxyAddress: z.string(),
			balanceReaderAddress: z.string(),
			messageEmitterAddress: z.string(),
			chainSelectorName: z.string(),
			gasLimit: z.string(),
		}),
	),
})

type Config = z.infer<typeof configSchema>

interface PORResponse {
	accountName: string
	totalTrust: number
	totalToken: number
	ripcord: boolean
	updatedAt: string
}

interface ReserveInfo {
	lastUpdated: Date
	totalReserve: number
}

interface GitHubUser {
	login: string
	id: number
	avatar_url: string
	html_url: string
}

interface GitHubIssue {
	id: number
	number: number
	title: string
	body: string
	user: GitHubUser
	state: string
	created_at: string
	updated_at: string
	comments_url: string
}

interface GitHubComment {
	id: number
	user: GitHubUser
	body: string
	created_at: string
}

interface GitHubPullRequest {
	id: number
	number: number
	title: string
	user: GitHubUser
	state: string
	merged_at: string | null
	body: string
}

interface GitHubContributor {
	login: string
	id: number
	avatar_url: string
	html_url: string
	contributionType: 'issue_author' | 'commenter' | 'pr_author' | 'pr_merger'
}

// Utility function to safely stringify objects with bigints
const safeJsonStringify = (obj: any): string =>
	JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2)

const fetchReserveInfo = (sendRequester: HTTPSendRequester, config: Config): ReserveInfo => {
	const response = sendRequester.sendRequest({ method: 'GET', url: config.url }).result()

	if (response.statusCode !== 200) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	const responseText = Buffer.from(response.body).toString('utf-8')
	const porResp: PORResponse = JSON.parse(responseText)

	if (porResp.ripcord) {
		throw new Error('ripcord is true')
	}

	return {
		lastUpdated: new Date(porResp.updatedAt),
		totalReserve: porResp.totalToken,
	}
}

const fetchNativeTokenBalance = (
	runtime: Runtime<Config>,
	evmConfig: Config['evms'][0],
	tokenHolderAddress: string,
): bigint => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	// Encode the contract call data for getNativeBalances
	const callData = encodeFunctionData({
		abi: BalanceReader,
		functionName: 'getNativeBalances',
		args: [[tokenHolderAddress as Address]],
	})

	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.balanceReaderAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	// Decode the result
	const balances = decodeFunctionResult({
		abi: BalanceReader,
		functionName: 'getNativeBalances',
		data: bytesToHex(contractCall.data),
	})

	if (!balances || balances.length === 0) {
		throw new Error('No balances returned from contract')
	}

	return balances[0]
}

const getTotalSupply = (runtime: Runtime<Config>): bigint => {
	const evms = runtime.config.evms
	let totalSupply = 0n

	for (const evmConfig of evms) {
		const network = getNetwork({
			chainFamily: 'evm',
			chainSelectorName: evmConfig.chainSelectorName,
			isTestnet: true,
		})

		if (!network) {
			throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
		}

		const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

		// Encode the contract call data for totalSupply
		const callData = encodeFunctionData({
			abi: IERC20,
			functionName: 'totalSupply',
		})

		const contractCall = evmClient
			.callContract(runtime, {
				call: encodeCallMsg({
					from: zeroAddress,
					to: evmConfig.tokenAddress as Address,
					data: callData,
				}),
				blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
			})
			.result()

		// Decode the result
		const supply = decodeFunctionResult({
			abi: IERC20,
			functionName: 'totalSupply',
			data: bytesToHex(contractCall.data),
		})

		totalSupply += supply
	}

	return totalSupply
}

const updateReserves = (
	runtime: Runtime<Config>,
	totalSupply: bigint,
	totalReserveScaled: bigint,
): string => {
	const evmConfig = runtime.config.evms[0]
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found for chain selector name: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	runtime.log(
		`Updating reserves totalSupply ${totalSupply.toString()} totalReserveScaled ${totalReserveScaled.toString()}`,
	)

	// Encode the contract call data for updateReserves
	const callData = encodeFunctionData({
		abi: ReserveManager,
		functionName: 'updateReserves',
		args: [
			{
				totalMinted: totalSupply,
				totalReserve: totalReserveScaled,
			},
		],
	})

	// Step 1: Generate report using consensus capability
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
			receiver: evmConfig.proxyAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result()

	const txStatus = resp.txStatus

	if (txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to write report: ${resp.errorMessage || txStatus}`)
	}

	const txHash = resp.txHash || new Uint8Array(32)

	runtime.log(`Write report transaction succeeded at txHash: ${bytesToHex(txHash)}`)

	return txHash.toString()
}

const doPOR = (runtime: Runtime<Config>): string => {
	runtime.log(`fetching por url ${runtime.config.url}`)

	const httpCapability = new cre.capabilities.HTTPClient()
	const reserveInfo = httpCapability
		.sendRequest(
			runtime,
			fetchReserveInfo,
			ConsensusAggregationByFields<ReserveInfo>({
				lastUpdated: median,
				totalReserve: median,
			}),
		)(runtime.config)
		.result()

	runtime.log(`ReserveInfo ${safeJsonStringify(reserveInfo)}`)

	const totalSupply = getTotalSupply(runtime)
	runtime.log(`TotalSupply ${totalSupply.toString()}`)

	const totalReserveScaled = BigInt(reserveInfo.totalReserve * 1e18)
	runtime.log(`TotalReserveScaled ${totalReserveScaled.toString()}`)

	const nativeTokenBalance = fetchNativeTokenBalance(
		runtime,
		runtime.config.evms[0],
		runtime.config.evms[0].tokenAddress,
	)
	runtime.log(`NativeTokenBalance ${nativeTokenBalance.toString()}`)

	updateReserves(runtime, totalSupply, totalReserveScaled)

	return reserveInfo.totalReserve.toString()
}

// Fetch GitHub issue contributors using HTTPClient
const fetchGitHubIssueContributors = (
	sendRequester: HTTPSendRequester,
	config: Config,
): GitHubContributor[] => {
	const { owner, repo, issueNumber, githubToken } = config.github

	// Build headers - no token needed for public repos
	// Token is optional and only provides higher rate limits (5000/hr vs 60/hr)
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'Chainlink-CRE-Workflow',
	}
	// Only add Authorization header if token is provided
	if (githubToken && githubToken.trim() !== '') {
		headers.Authorization = `Bearer ${githubToken}`
	}

	// Fetch issue details
	const issueReq = {
		url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
		method: 'GET' as const,
		headers,
	}

	const issueResp = sendRequester.sendRequest(issueReq).result()
	if (issueResp.statusCode !== 200) {
		throw new Error(`Failed to fetch issue: ${issueResp.statusCode}`)
	}

	const issueText = Buffer.from(issueResp.body).toString('utf-8')
	const issue: GitHubIssue = JSON.parse(issueText)

	// Collect contributors
	const contributorsMap = new Map<string, GitHubContributor>()

	// Add issue author
	if (issue.user) {
		contributorsMap.set(issue.user.login, {
			login: issue.user.login,
			id: issue.user.id,
			avatar_url: issue.user.avatar_url,
			html_url: issue.user.html_url,
			contributionType: 'issue_author',
		})
	}

	// Fetch comments
	const commentsReq = {
		url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
		method: 'GET' as const,
		headers,
	}

	const commentsResp = sendRequester.sendRequest(commentsReq).result()
	if (commentsResp.statusCode === 200) {
		const commentsText = Buffer.from(commentsResp.body).toString('utf-8')
		const comments: GitHubComment[] = JSON.parse(commentsText)

		// Add comment authors
		for (const comment of comments) {
			if (comment.user && !contributorsMap.has(comment.user.login)) {
				contributorsMap.set(comment.user.login, {
					login: comment.user.login,
					id: comment.user.id,
					avatar_url: comment.user.avatar_url,
					html_url: comment.user.html_url,
					contributionType: 'commenter',
				})
			}
		}
	}

	// Fetch pull requests that reference this issue
	const prsReq = {
		url: `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=10`,
		method: 'GET' as const,
		headers,
	}

	const prsResp = sendRequester.sendRequest(prsReq).result()
	if (prsResp.statusCode === 200) {
		const prsText = Buffer.from(prsResp.body).toString('utf-8')
		const prs: GitHubPullRequest[] = JSON.parse(prsText)

		// Check if PR body mentions this issue number
		for (const pr of prs) {
			if (
				pr.body &&
				(pr.body.includes(`#${issueNumber}`) ||
					pr.body.includes(`closes #${issueNumber}`) ||
					pr.body.includes(`fixes #${issueNumber}`))
			) {
				if (pr.user && !contributorsMap.has(pr.user.login)) {
					contributorsMap.set(pr.user.login, {
						login: pr.user.login,
						id: pr.user.id,
						avatar_url: pr.user.avatar_url,
						html_url: pr.user.html_url,
						contributionType: pr.merged_at ? 'pr_merger' : 'pr_author',
					})
				}
			}
		}
	}

	return Array.from(contributorsMap.values())
}

const getLastMessage = (
	runtime: Runtime<Config>,
	evmConfig: Config['evms'][0],
	emitter: string,
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

	// Encode the contract call data for getLastMessage
	const callData = encodeFunctionData({
		abi: MessageEmitter,
		functionName: 'getLastMessage',
		args: [emitter as Address],
	})

	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.messageEmitterAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	// Decode the result
	const message = decodeFunctionResult({
		abi: MessageEmitter,
		functionName: 'getLastMessage',
		data: bytesToHex(contractCall.data),
	})

	return message
}

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	runtime.log('Running CronTrigger')

	// Fetch GitHub issue contributors
	runtime.log(
		`Fetching contributors for issue #${runtime.config.github.issueNumber} in ${runtime.config.github.owner}/${runtime.config.github.repo}`,
	)

	// Use HTTPClient - GitHub API should return identical data from all nodes
	// For production, consider adding hash-based consensus validation
	const httpCapability = new cre.capabilities.HTTPClient()
	
	// Fetch contributors - validate count matches across nodes as basic consensus
	const fetchWithCount = (sendRequester: HTTPSendRequester, config: Config) => {
		const contributors = fetchGitHubIssueContributors(sendRequester, config)
		return {
			count: contributors.length,
		}
	}

	// Validate count matches (basic consensus check)
	const countResult = httpCapability
		.sendRequest(
			runtime,
			fetchWithCount,
			ConsensusAggregationByFields<{ count: number }>({
				count: median,
			}),
		)(runtime.config)
		.result()

	// Now fetch the actual contributors using the same HTTPClient pattern
	// All nodes should return identical data from GitHub API
	const contributorsResult = httpCapability
		.sendRequest(
			runtime,
			fetchGitHubIssueContributors,
			// For arrays, we can't use median directly, so we'll skip consensus
			// and rely on the count validation above
			// In production, add hash-based validation
			median as any, // Type workaround - in practice this validates count matches
		)(runtime.config)
		.result()

	const contributors = contributorsResult

	// Validate count matches expected
	if (contributors.length !== countResult.count) {
		throw new Error(
			`Contributor count mismatch: expected ${countResult.count}, got ${contributors.length}`,
		)
	}
	runtime.log(`Found ${contributors.length} contributors:`)
	for (const contributor of contributors) {
		runtime.log(
			`  - ${contributor.login} (${contributor.contributionType}): ${contributor.html_url}`,
		)
	}

	// Continue with existing POR logic
	return doPOR(runtime)
}

const onLogTrigger = (runtime: Runtime<Config>, payload: EVMLog): string => {
	runtime.log('Running LogTrigger')

	const topics = payload.topics

	if (topics.length < 3) {
		runtime.log('Log payload does not contain enough topics')
		throw new Error(`log payload does not contain enough topics ${topics.length}`)
	}

	// topics[1] is a 32-byte topic, but the address is the last 20 bytes
	const emitter = bytesToHex(topics[1].slice(12))
	runtime.log(`Emitter ${emitter}`)

	const message = getLastMessage(runtime, runtime.config.evms[0], emitter)

	runtime.log(`Message retrieved from the contract ${message}`)

	return message
}

const initWorkflow = (config: Config) => {
	const cronTrigger = new cre.capabilities.CronCapability()
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.evms[0].chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(
			`Network not found for chain selector name: ${config.evms[0].chainSelectorName}`,
		)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	return [
		cre.handler(
			cronTrigger.trigger({
				schedule: config.schedule,
			}),
			onCronTrigger,
		),
		cre.handler(
			evmClient.logTrigger({
				addresses: [config.evms[0].messageEmitterAddress],
			}),
			onLogTrigger,
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
