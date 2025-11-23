import {
  cre,
  consensusMedianAggregation,
  Runner,
  type NodeRuntime,
  type Runtime,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  encodeCallMsg,
  bytesToHex,
  hexToBase64,
  TxStatus,
} from "@chainlink/cre-sdk"
import { encodeFunctionData, decodeFunctionResult, zeroAddress, encodeAbiParameters, parseAbiParameters } from "viem"
import { Storage } from "../contracts/abi"

// EvmConfig defines the configuration for a single EVM chain.
type EvmConfig = {
  storageAddress: string
  calculatorConsumerAddress: string
  chainName: string
  gasLimit: string
}

type Config = {
  schedule: string
  apiUrl: string
  evms: EvmConfig[]
}

type MyResult = {
  finalResult: bigint
  offchainValue: bigint
  onchainValue: bigint
  txHash: string
}

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability()

  return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

// fetchMathResult is the function passed to the runInNodeMode helper.
const fetchMathResult = (nodeRuntime: NodeRuntime<Config>): bigint => {
  const httpClient = new cre.capabilities.HTTPClient()

  const req = {
    url: nodeRuntime.config.apiUrl,
    method: "GET" as const,
  }

  const resp = httpClient.sendRequest(nodeRuntime, req).result()
  const bodyText = new TextDecoder().decode(resp.body)
  const val = BigInt(bodyText.trim())

  return val
}

const onCronTrigger = (runtime: Runtime<Config>): MyResult => {
  // Step 1: Fetch offchain data (from Part 2)
  const offchainValue = runtime.runInNodeMode(fetchMathResult, consensusMedianAggregation())().result()

  runtime.log(`Successfully fetched offchain value: ${offchainValue}`)

  // Get the first EVM configuration from the list.
  const evmConfig = runtime.config.evms[0]

  // Step 2: Read onchain data using the EVM client
  // Convert the human-readable chain name to a chain selector
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: true,
  })
  if (!network) {
    throw new Error(`Unknown chain name: ${evmConfig.chainName}`)
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

  // Encode the function call using the Storage ABI
  const callData = encodeFunctionData({
    abi: Storage,
    functionName: "get",
  })

  // Call the contract
  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: evmConfig.storageAddress as `0x${string}`,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  // Decode the result
  const onchainValue = decodeFunctionResult({
    abi: Storage,
    functionName: "get",
    data: bytesToHex(contractCall.data),
  }) as bigint

  runtime.log(`Successfully read onchain value: ${onchainValue}`)

  // Step 3: Combine the results
  const finalResult = onchainValue + offchainValue
  runtime.log(`Final calculated result: ${finalResult}`)

  // Step 4: Write the result onchain
  runtime.log(`Updating calculator result for consumer: ${evmConfig.calculatorConsumerAddress}`)

  // Define the CalculatorResult struct parameters
  const calculatorResultParams = parseAbiParameters([
    "uint256 offchainValue",
    "int256 onchainValue",
    "uint256 finalResult",
  ])

  // Encode the struct data
  const reportData = encodeAbiParameters(calculatorResultParams, [
    offchainValue,
    onchainValue, // uint256 from Storage contract, will be treated as int256
    finalResult,
  ])

  runtime.log(
    `Writing report to consumer contract - offchainValue: ${offchainValue}, onchainValue: ${onchainValue}, finalResult: ${finalResult}`
  )

  // Generate a signed report using the consensus capability
  // reportData is a hex string (0x...), convert to base64 for encodedPayload
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  runtime.log("Waiting for write report response")

  // Submit the report to the consumer contract
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.calculatorConsumerAddress as `0x${string}`,
      report: reportResponse,
      gasConfig: {
        gasLimit: evmConfig.gasLimit,
      },
    })
    .result()

  const txStatus = writeResult.txStatus
  if (txStatus !== TxStatus.SUCCESS) {
    throw new Error(`Failed to write report: ${writeResult.errorMessage || txStatus}`)
  }

  const txHash = writeResult.txHash || new Uint8Array(32)
  const txHashHex = bytesToHex(txHash)
  runtime.log(`Write report transaction succeeded: ${txHashHex}`)
  runtime.log(`View transaction at https://sepolia.etherscan.io/tx/${txHashHex}`)
  runtime.log(
    `Workflow finished successfully! offchainValue: ${offchainValue}, onchainValue: ${onchainValue}, finalResult: ${finalResult}, txHash: ${txHashHex}`
  )

  return {
    finalResult,
    offchainValue,
    onchainValue,
    txHash: txHashHex,
  }
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}

main()
