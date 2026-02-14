import { encodeFunctionData, getAddress, type Address, type Hex, type WalletClient, type PublicClient } from 'viem';
import { ForwarderABI } from './abis';

/**
 * EIP-712 domain for the AgentHub Forwarder
 */
export interface ForwarderDomain {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: Address;
}

/**
 * Forward request data (before signing)
 */
export interface ForwardRequestInput {
  from: Address;
  to: Address;
  value: bigint;
  gas: bigint;
  nonce: bigint;
  deadline: number; // uint48 in Solidity
  data: Hex;
}

/**
 * Signed forward request (ready for execution)
 */
export interface SignedForwardRequest extends Omit<ForwardRequestInput, 'nonce'> {
  signature: Hex;
}

/**
 * EIP-712 types for ForwardRequest
 */
export const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
  ],
} as const;

/**
 * Get the current nonce for an address from the forwarder
 */
export async function getForwarderNonce(
  publicClient: PublicClient,
  forwarderAddress: Address,
  account: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: forwarderAddress,
    abi: ForwarderABI,
    functionName: 'nonces',
    args: [account],
  }) as Promise<bigint>;
}

/**
 * Get the EIP-712 domain for the forwarder
 */
export async function getForwarderDomain(
  publicClient: PublicClient,
  forwarderAddress: Address
): Promise<ForwarderDomain> {
  const chainId = await publicClient.getChainId();
  return {
    name: 'AgentHub Forwarder',
    version: '1',
    chainId: BigInt(chainId),
    verifyingContract: getAddress(forwarderAddress),
  };
}

/**
 * Create an unsigned forward request
 */
export function createForwardRequest(params: {
  from: Address;
  to: Address;
  data: Hex;
  nonce: bigint;
  value?: bigint;
  gas?: bigint;
  deadlineSeconds?: number;
}): ForwardRequestInput {
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + (params.deadlineSeconds ?? 3600); // Default 1 hour

  return {
    from: getAddress(params.from),
    to: getAddress(params.to),
    value: params.value ?? 0n,
    gas: params.gas ?? 500000n,
    nonce: params.nonce,
    deadline, // number for uint48
    data: params.data,
  };
}

/**
 * Sign a forward request using EIP-712
 */
export async function signForwardRequest(
  walletClient: WalletClient,
  domain: ForwarderDomain,
  request: ForwardRequestInput
): Promise<SignedForwardRequest> {
  const account = walletClient.account;
  if (!account) {
    throw new Error('Wallet client has no account');
  }

  // Sign with EIP-712
  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    },
    types: FORWARD_REQUEST_TYPES,
    primaryType: 'ForwardRequest',
    message: {
      from: request.from,
      to: request.to,
      value: request.value,
      gas: request.gas,
      nonce: request.nonce,
      deadline: request.deadline,
      data: request.data,
    },
  });

  return {
    from: request.from,
    to: request.to,
    value: request.value,
    gas: request.gas,
    deadline: request.deadline,
    data: request.data,
    signature,
  };
}

/**
 * Helper: Create a gasless transaction for AgentRegistry.registerAgent
 */
export async function createGaslessRegisterAgent(
  publicClient: PublicClient,
  walletClient: WalletClient,
  params: {
    forwarderAddress: Address;
    registryAddress: Address;
    name: string;
    metadataURI: string;
    capabilities: string[];
    stakeAmount: bigint;
  }
): Promise<SignedForwardRequest> {
  const account = walletClient.account;
  if (!account) throw new Error('No account');

  // Import AgentRegistry ABI (just the function we need)
  const registerAgentData = encodeFunctionData({
    abi: [{
      inputs: [
        { name: 'name', type: 'string' },
        { name: 'metadataURI', type: 'string' },
        { name: 'capabilities', type: 'string[]' },
        { name: 'stakeAmount', type: 'uint256' },
      ],
      name: 'registerAgent',
      outputs: [{ name: 'agentId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
      type: 'function',
    }],
    functionName: 'registerAgent',
    args: [params.name, params.metadataURI, params.capabilities, params.stakeAmount],
  });

  const nonce = await getForwarderNonce(publicClient, params.forwarderAddress, account.address);
  const domain = await getForwarderDomain(publicClient, params.forwarderAddress);

  const request = createForwardRequest({
    from: account.address,
    to: params.registryAddress,
    data: registerAgentData,
    nonce,
    gas: 600000n,
  });

  return signForwardRequest(walletClient, domain, request);
}

/**
 * Helper: Create a gasless transaction for TaskMarketplace.createTask
 */
export async function createGaslessCreateTask(
  publicClient: PublicClient,
  walletClient: WalletClient,
  params: {
    forwarderAddress: Address;
    marketplaceAddress: Address;
    title: string;
    descriptionURI: string;
    requiredCapabilities: string[];
    reward: bigint;
    deadline: bigint;
    requiresHumanVerification: boolean;
  }
): Promise<SignedForwardRequest> {
  const account = walletClient.account;
  if (!account) throw new Error('No account');

  const createTaskData = encodeFunctionData({
    abi: [{
      inputs: [
        { name: 'title', type: 'string' },
        { name: 'descriptionURI', type: 'string' },
        { name: 'requiredCapabilities', type: 'string[]' },
        { name: 'reward', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'requiresHumanVerification', type: 'bool' },
      ],
      name: 'createTask',
      outputs: [{ name: 'taskId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
      type: 'function',
    }],
    functionName: 'createTask',
    args: [
      params.title,
      params.descriptionURI,
      params.requiredCapabilities,
      params.reward,
      params.deadline,
      params.requiresHumanVerification,
    ],
  });

  const nonce = await getForwarderNonce(publicClient, params.forwarderAddress, account.address);
  const domain = await getForwarderDomain(publicClient, params.forwarderAddress);

  const request = createForwardRequest({
    from: account.address,
    to: params.marketplaceAddress,
    data: createTaskData,
    nonce,
    gas: 600000n,
  });

  return signForwardRequest(walletClient, domain, request);
}

/**
 * Submit a signed forward request to the forwarder
 * (Typically done by a relayer, not the user)
 * 
 * @param walletClient - viem wallet client with chain configured
 * @param forwarderAddress - Address of the Forwarder contract
 * @param request - Signed forward request
 * @returns Transaction hash
 */
export async function submitForwardRequest(
  walletClient: WalletClient,
  forwarderAddress: Address,
  request: SignedForwardRequest
): Promise<Hex> {
  const account = walletClient.account;
  if (!account) throw new Error('No account');
  
  const chain = walletClient.chain;
  if (!chain) throw new Error('No chain configured on wallet client');

  const hash = await walletClient.writeContract({
    address: forwarderAddress,
    abi: ForwarderABI,
    functionName: 'execute',
    args: [request],
    account,
    chain,
  });

  return hash;
}
