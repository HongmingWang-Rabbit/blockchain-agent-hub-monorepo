import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseEther, encodeFunctionData, type Address, type Hex, type PublicClient, type WalletClient, type Chain } from 'viem';
import {
  FORWARD_REQUEST_TYPES,
  createForwardRequest,
  getForwarderNonce,
  getForwarderDomain,
  signForwardRequest,
  createGaslessRegisterAgent,
  createGaslessCreateTask,
  submitForwardRequest,
  type ForwarderDomain,
  type ForwardRequestInput,
  type SignedForwardRequest,
} from './gasless';

// Test addresses - valid checksummed addresses
const TEST_USER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address;
const TEST_FORWARDER = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address;
const TEST_REGISTRY = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address;
const TEST_MARKETPLACE = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address;
const TEST_SIGNATURE = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1c' as Hex;

describe('Gasless SDK', () => {
  describe('FORWARD_REQUEST_TYPES', () => {
    it('should have correct EIP-712 type definition', () => {
      expect(FORWARD_REQUEST_TYPES).toHaveProperty('ForwardRequest');
      expect(FORWARD_REQUEST_TYPES.ForwardRequest).toHaveLength(7);
      
      const fieldNames = FORWARD_REQUEST_TYPES.ForwardRequest.map(f => f.name);
      expect(fieldNames).toContain('from');
      expect(fieldNames).toContain('to');
      expect(fieldNames).toContain('value');
      expect(fieldNames).toContain('gas');
      expect(fieldNames).toContain('nonce');
      expect(fieldNames).toContain('deadline');
      expect(fieldNames).toContain('data');
    });

    it('should have correct field types', () => {
      const typeMap = Object.fromEntries(
        FORWARD_REQUEST_TYPES.ForwardRequest.map(f => [f.name, f.type])
      );
      
      expect(typeMap.from).toBe('address');
      expect(typeMap.to).toBe('address');
      expect(typeMap.value).toBe('uint256');
      expect(typeMap.gas).toBe('uint256');
      expect(typeMap.nonce).toBe('uint256');
      expect(typeMap.deadline).toBe('uint48');
      expect(typeMap.data).toBe('bytes');
    });
  });

  describe('createForwardRequest', () => {
    it('should create a forward request with defaults', () => {
      const request = createForwardRequest({
        from: TEST_USER,
        to: TEST_REGISTRY,
        data: '0x1234' as Hex,
        nonce: 0n,
      });

      expect(request.from).toBe(TEST_USER);
      expect(request.to).toBe(TEST_REGISTRY);
      expect(request.data).toBe('0x1234');
      expect(request.nonce).toBe(0n);
      expect(request.value).toBe(0n);
      expect(request.gas).toBe(500000n);
      // Deadline should be ~1 hour from now
      expect(request.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(request.deadline).toBeLessThan(Math.floor(Date.now() / 1000) + 3700);
    });

    it('should allow custom value and gas', () => {
      const request = createForwardRequest({
        from: TEST_USER,
        to: TEST_REGISTRY,
        data: '0x1234' as Hex,
        nonce: 5n,
        value: parseEther('1'),
        gas: 1000000n,
      });

      expect(request.value).toBe(parseEther('1'));
      expect(request.gas).toBe(1000000n);
      expect(request.nonce).toBe(5n);
    });

    it('should allow custom deadline', () => {
      const request = createForwardRequest({
        from: TEST_USER,
        to: TEST_REGISTRY,
        data: '0x1234' as Hex,
        nonce: 0n,
        deadlineSeconds: 7200, // 2 hours
      });

      const expectedDeadline = Math.floor(Date.now() / 1000) + 7200;
      expect(request.deadline).toBeGreaterThanOrEqual(expectedDeadline - 5);
      expect(request.deadline).toBeLessThanOrEqual(expectedDeadline + 5);
    });

    it('should normalize addresses', () => {
      const request = createForwardRequest({
        from: '0x1234567890123456789012345678901234567890' as Address,
        to: '0xabcdef1234567890abcdef1234567890abcdef12' as Address,
        data: '0x' as Hex,
        nonce: 0n,
      });

      // Addresses should be checksummed
      expect(request.from).toBe('0x1234567890123456789012345678901234567890');
      expect(request.to).toBe('0xABcdEf1234567890AbcdEF1234567890aBCDEF12');
    });
  });

  describe('getForwarderNonce', () => {
    it('should call readContract with correct params', async () => {
      const mockPublicClient = {
        readContract: vi.fn().mockResolvedValue(42n),
      } as unknown as PublicClient;

      const nonce = await getForwarderNonce(mockPublicClient, TEST_FORWARDER, TEST_USER);

      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: TEST_FORWARDER,
        abi: expect.any(Array),
        functionName: 'nonces',
        args: [TEST_USER],
      });
      expect(nonce).toBe(42n);
    });
  });

  describe('getForwarderDomain', () => {
    it('should return correct domain structure', async () => {
      const mockPublicClient = {
        getChainId: vi.fn().mockResolvedValue(133),
      } as unknown as PublicClient;

      const domain = await getForwarderDomain(mockPublicClient, TEST_FORWARDER);

      expect(domain.name).toBe('AgentHub Forwarder');
      expect(domain.version).toBe('1');
      expect(domain.chainId).toBe(133n);
      expect(domain.verifyingContract).toBe(TEST_FORWARDER);
    });

    it('should handle different chain IDs', async () => {
      const mockPublicClient = {
        getChainId: vi.fn().mockResolvedValue(1),
      } as unknown as PublicClient;

      const domain = await getForwarderDomain(mockPublicClient, TEST_FORWARDER);

      expect(domain.chainId).toBe(1n);
    });
  });

  describe('signForwardRequest', () => {
    it('should sign with EIP-712', async () => {
      const mockWalletClient = {
        account: { address: TEST_USER },
        signTypedData: vi.fn().mockResolvedValue(TEST_SIGNATURE),
      } as unknown as WalletClient;

      const domain: ForwarderDomain = {
        name: 'AgentHub Forwarder',
        version: '1',
        chainId: 133n,
        verifyingContract: TEST_FORWARDER,
      };

      const request: ForwardRequestInput = {
        from: TEST_USER,
        to: TEST_REGISTRY,
        value: 0n,
        gas: 500000n,
        nonce: 0n,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        data: '0x1234' as Hex,
      };

      const signed = await signForwardRequest(mockWalletClient, domain, request);

      expect(mockWalletClient.signTypedData).toHaveBeenCalledWith({
        account: { address: TEST_USER },
        domain: {
          name: 'AgentHub Forwarder',
          version: '1',
          chainId: 133n,
          verifyingContract: TEST_FORWARDER,
        },
        types: FORWARD_REQUEST_TYPES,
        primaryType: 'ForwardRequest',
        message: expect.objectContaining({
          from: TEST_USER,
          to: TEST_REGISTRY,
          nonce: 0n,
        }),
      });

      expect(signed.signature).toBe(TEST_SIGNATURE);
      expect(signed.from).toBe(request.from);
      expect(signed.to).toBe(request.to);
      expect(signed.data).toBe(request.data);
    });

    it('should throw if wallet has no account', async () => {
      const mockWalletClient = {
        account: undefined,
      } as unknown as WalletClient;

      const domain: ForwarderDomain = {
        name: 'AgentHub Forwarder',
        version: '1',
        chainId: 133n,
        verifyingContract: TEST_FORWARDER,
      };

      const request: ForwardRequestInput = {
        from: TEST_USER,
        to: TEST_REGISTRY,
        value: 0n,
        gas: 500000n,
        nonce: 0n,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        data: '0x1234' as Hex,
      };

      await expect(signForwardRequest(mockWalletClient, domain, request))
        .rejects.toThrow('Wallet client has no account');
    });
  });

  describe('createGaslessRegisterAgent', () => {
    let mockPublicClient: PublicClient;
    let mockWalletClient: WalletClient;

    beforeEach(() => {
      mockPublicClient = {
        readContract: vi.fn().mockResolvedValue(0n),
        getChainId: vi.fn().mockResolvedValue(133),
      } as unknown as PublicClient;

      mockWalletClient = {
        account: { address: TEST_USER },
        signTypedData: vi.fn().mockResolvedValue(TEST_SIGNATURE),
      } as unknown as WalletClient;
    });

    it('should create signed request for registerAgent', async () => {
      const signed = await createGaslessRegisterAgent(mockPublicClient, mockWalletClient, {
        forwarderAddress: TEST_FORWARDER,
        registryAddress: TEST_REGISTRY,
        name: 'Test Agent',
        metadataURI: 'ipfs://QmTest123',
        capabilities: ['code-review', 'testing'],
        stakeAmount: parseEther('100'),
      });

      expect(signed.from).toBe(TEST_USER);
      expect(signed.to).toBe(TEST_REGISTRY);
      expect(signed.signature).toBe(TEST_SIGNATURE);
      expect(signed.gas).toBe(600000n);
      expect(signed.value).toBe(0n);
      // Data should be encoded registerAgent calldata
      expect(signed.data).toMatch(/^0x/);
      expect(signed.data.length).toBeGreaterThan(10);
    });

    it('should fetch nonce from forwarder', async () => {
      await createGaslessRegisterAgent(mockPublicClient, mockWalletClient, {
        forwarderAddress: TEST_FORWARDER,
        registryAddress: TEST_REGISTRY,
        name: 'Test Agent',
        metadataURI: 'ipfs://QmTest',
        capabilities: ['testing'],
        stakeAmount: parseEther('50'),
      });

      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: TEST_FORWARDER,
          functionName: 'nonces',
          args: [TEST_USER],
        })
      );
    });

    it('should throw if wallet has no account', async () => {
      const noAccountWallet = {
        account: undefined,
      } as unknown as WalletClient;

      await expect(
        createGaslessRegisterAgent(mockPublicClient, noAccountWallet, {
          forwarderAddress: TEST_FORWARDER,
          registryAddress: TEST_REGISTRY,
          name: 'Test',
          metadataURI: 'ipfs://test',
          capabilities: [],
          stakeAmount: 0n,
        })
      ).rejects.toThrow('No account');
    });
  });

  describe('createGaslessCreateTask', () => {
    let mockPublicClient: PublicClient;
    let mockWalletClient: WalletClient;

    beforeEach(() => {
      mockPublicClient = {
        readContract: vi.fn().mockResolvedValue(5n),
        getChainId: vi.fn().mockResolvedValue(133),
      } as unknown as PublicClient;

      mockWalletClient = {
        account: { address: TEST_USER },
        signTypedData: vi.fn().mockResolvedValue(TEST_SIGNATURE),
      } as unknown as WalletClient;
    });

    it('should create signed request for createTask', async () => {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      const signed = await createGaslessCreateTask(mockPublicClient, mockWalletClient, {
        forwarderAddress: TEST_FORWARDER,
        marketplaceAddress: TEST_MARKETPLACE,
        title: 'Review PR #42',
        descriptionURI: 'ipfs://QmTaskDescription',
        requiredCapabilities: ['code-review'],
        reward: parseEther('50'),
        deadline,
        requiresHumanVerification: false,
      });

      expect(signed.from).toBe(TEST_USER);
      expect(signed.to).toBe(TEST_MARKETPLACE);
      expect(signed.signature).toBe(TEST_SIGNATURE);
      expect(signed.gas).toBe(600000n);
      expect(signed.data).toMatch(/^0x/);
    });

    it('should handle human verification flag', async () => {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      const signed = await createGaslessCreateTask(mockPublicClient, mockWalletClient, {
        forwarderAddress: TEST_FORWARDER,
        marketplaceAddress: TEST_MARKETPLACE,
        title: 'Sensitive Task',
        descriptionURI: 'ipfs://QmSensitive',
        requiredCapabilities: ['manual-review'],
        reward: parseEther('100'),
        deadline,
        requiresHumanVerification: true,
      });

      expect(signed).toBeDefined();
      expect(signed.signature).toBe(TEST_SIGNATURE);
    });

    it('should use correct nonce', async () => {
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(42n);

      await createGaslessCreateTask(mockPublicClient, mockWalletClient, {
        forwarderAddress: TEST_FORWARDER,
        marketplaceAddress: TEST_MARKETPLACE,
        title: 'Test',
        descriptionURI: 'ipfs://test',
        requiredCapabilities: [],
        reward: 0n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        requiresHumanVerification: false,
      });

      expect(mockWalletClient.signTypedData).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            nonce: 42n,
          }),
        })
      );
    });
  });

  describe('submitForwardRequest', () => {
    it('should call writeContract with correct params', async () => {
      const mockHash = '0xabc123' as Hex;
      const mockChain = { id: 133, name: 'HashKey Testnet' } as Chain;
      
      const mockWalletClient = {
        account: { address: TEST_USER },
        chain: mockChain,
        writeContract: vi.fn().mockResolvedValue(mockHash),
      } as unknown as WalletClient;

      const request: SignedForwardRequest = {
        from: TEST_USER,
        to: TEST_REGISTRY,
        value: 0n,
        gas: 500000n,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        data: '0x1234' as Hex,
        signature: TEST_SIGNATURE,
      };

      const hash = await submitForwardRequest(mockWalletClient, TEST_FORWARDER, request);

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith({
        address: TEST_FORWARDER,
        abi: expect.any(Array),
        functionName: 'execute',
        args: [request],
        account: { address: TEST_USER },
        chain: mockChain,
      });
      expect(hash).toBe(mockHash);
    });

    it('should throw if wallet has no account', async () => {
      const mockWalletClient = {
        account: undefined,
        chain: { id: 133 },
      } as unknown as WalletClient;

      const request: SignedForwardRequest = {
        from: TEST_USER,
        to: TEST_REGISTRY,
        value: 0n,
        gas: 500000n,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        data: '0x' as Hex,
        signature: TEST_SIGNATURE,
      };

      await expect(submitForwardRequest(mockWalletClient, TEST_FORWARDER, request))
        .rejects.toThrow('No account');
    });

    it('should throw if wallet has no chain', async () => {
      const mockWalletClient = {
        account: { address: TEST_USER },
        chain: undefined,
      } as unknown as WalletClient;

      const request: SignedForwardRequest = {
        from: TEST_USER,
        to: TEST_REGISTRY,
        value: 0n,
        gas: 500000n,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        data: '0x' as Hex,
        signature: TEST_SIGNATURE,
      };

      await expect(submitForwardRequest(mockWalletClient, TEST_FORWARDER, request))
        .rejects.toThrow('No chain');
    });
  });

  describe('Integration - Full Flow', () => {
    it('should create valid signed request with all steps', async () => {
      const mockPublicClient = {
        readContract: vi.fn().mockResolvedValue(0n),
        getChainId: vi.fn().mockResolvedValue(133),
      } as unknown as PublicClient;

      const mockWalletClient = {
        account: { address: TEST_USER },
        signTypedData: vi.fn().mockResolvedValue(TEST_SIGNATURE),
      } as unknown as WalletClient;

      // Step 1: Get nonce
      const nonce = await getForwarderNonce(mockPublicClient, TEST_FORWARDER, TEST_USER);
      expect(nonce).toBe(0n);

      // Step 2: Get domain
      const domain = await getForwarderDomain(mockPublicClient, TEST_FORWARDER);
      expect(domain.chainId).toBe(133n);

      // Step 3: Create request
      const request = createForwardRequest({
        from: TEST_USER,
        to: TEST_REGISTRY,
        data: '0x12345678' as Hex,
        nonce,
      });
      expect(request.from).toBe(TEST_USER);

      // Step 4: Sign request
      const signed = await signForwardRequest(mockWalletClient, domain, request);
      expect(signed.signature).toBe(TEST_SIGNATURE);
      
      // Verify nonce is not in signed request (omitted per interface)
      expect(signed).not.toHaveProperty('nonce');
    });
  });
});
