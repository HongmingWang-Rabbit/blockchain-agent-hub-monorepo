import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import {
  BatchOperationsABI,
  createTaskInputs,
  BatchManager,
  type BatchTaskInput,
} from './batch';

describe('Batch Operations', () => {
  describe('BatchOperationsABI', () => {
    it('should have createTaskBatch function', () => {
      const fn = BatchOperationsABI.find(
        (item) => item.type === 'function' && item.name === 'createTaskBatch'
      );
      expect(fn).toBeDefined();
      expect(fn?.inputs).toHaveLength(1);
      expect(fn?.inputs[0].type).toBe('tuple[]');
    });

    it('should have createTaskBatchFromTemplate function', () => {
      const fn = BatchOperationsABI.find(
        (item) => item.type === 'function' && item.name === 'createTaskBatchFromTemplate'
      );
      expect(fn).toBeDefined();
      expect(fn?.inputs).toHaveLength(6);
    });

    it('should have acceptTaskBatch function', () => {
      const fn = BatchOperationsABI.find(
        (item) => item.type === 'function' && item.name === 'acceptTaskBatch'
      );
      expect(fn).toBeDefined();
    });

    it('should have BatchCreated event', () => {
      const event = BatchOperationsABI.find(
        (item) => item.type === 'event' && item.name === 'BatchCreated'
      );
      expect(event).toBeDefined();
      expect(event?.inputs).toHaveLength(4);
    });

    it('should have BatchTaskCreated event', () => {
      const event = BatchOperationsABI.find(
        (item) => item.type === 'event' && item.name === 'BatchTaskCreated'
      );
      expect(event).toBeDefined();
    });
  });

  describe('createTaskInputs', () => {
    it('should convert string AGNT amounts to bigint', () => {
      const inputs = createTaskInputs([
        {
          title: 'Test Task',
          descriptionURI: 'ipfs://test',
          requiredCapabilities: ['code-review'],
          rewardAGNT: '100',
          deadlineHours: 24,
        },
      ]);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].reward).toBe(parseEther('100'));
    });

    it('should calculate deadline correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const inputs = createTaskInputs([
        {
          title: 'Test Task',
          descriptionURI: 'ipfs://test',
          requiredCapabilities: ['code-review'],
          rewardAGNT: '10',
          deadlineHours: 48,
        },
      ]);

      const expectedDeadline = BigInt(now) + BigInt(48 * 3600);
      // Allow 5 second tolerance
      expect(Number(inputs[0].deadline)).toBeGreaterThanOrEqual(Number(expectedDeadline) - 5);
      expect(Number(inputs[0].deadline)).toBeLessThanOrEqual(Number(expectedDeadline) + 5);
    });

    it('should default requiresHumanVerification to false', () => {
      const inputs = createTaskInputs([
        {
          title: 'Test Task',
          descriptionURI: 'ipfs://test',
          requiredCapabilities: ['code-review'],
          rewardAGNT: '10',
          deadlineHours: 24,
        },
      ]);

      expect(inputs[0].requiresHumanVerification).toBe(false);
    });

    it('should respect requiresHumanVerification when set', () => {
      const inputs = createTaskInputs([
        {
          title: 'Test Task',
          descriptionURI: 'ipfs://test',
          requiredCapabilities: ['code-review'],
          rewardAGNT: '10',
          deadlineHours: 24,
          requiresHumanVerification: true,
        },
      ]);

      expect(inputs[0].requiresHumanVerification).toBe(true);
    });

    it('should handle multiple tasks', () => {
      const inputs = createTaskInputs([
        {
          title: 'Task 1',
          descriptionURI: 'ipfs://task1',
          requiredCapabilities: ['code-review'],
          rewardAGNT: '10',
          deadlineHours: 24,
        },
        {
          title: 'Task 2',
          descriptionURI: 'ipfs://task2',
          requiredCapabilities: ['debugging'],
          rewardAGNT: '25',
          deadlineHours: 48,
        },
        {
          title: 'Task 3',
          descriptionURI: 'ipfs://task3',
          requiredCapabilities: ['text-generation', 'translation'],
          rewardAGNT: '50',
          deadlineHours: 72,
          requiresHumanVerification: true,
        },
      ]);

      expect(inputs).toHaveLength(3);
      expect(inputs[0].title).toBe('Task 1');
      expect(inputs[0].reward).toBe(parseEther('10'));
      expect(inputs[1].title).toBe('Task 2');
      expect(inputs[1].reward).toBe(parseEther('25'));
      expect(inputs[2].title).toBe('Task 3');
      expect(inputs[2].reward).toBe(parseEther('50'));
      expect(inputs[2].requiredCapabilities).toEqual(['text-generation', 'translation']);
      expect(inputs[2].requiresHumanVerification).toBe(true);
    });

    it('should handle decimal AGNT amounts', () => {
      const inputs = createTaskInputs([
        {
          title: 'Test Task',
          descriptionURI: 'ipfs://test',
          requiredCapabilities: ['code-review'],
          rewardAGNT: '10.5',
          deadlineHours: 24,
        },
      ]);

      expect(inputs[0].reward).toBe(parseEther('10.5'));
    });
  });

  describe('BatchTaskInput type', () => {
    it('should accept valid task input', () => {
      const input: BatchTaskInput = {
        title: 'Test Task',
        descriptionURI: 'ipfs://test',
        requiredCapabilities: ['code-review', 'debugging'],
        reward: parseEther('100'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        requiresHumanVerification: false,
      };

      expect(input.title).toBe('Test Task');
      expect(input.requiredCapabilities).toHaveLength(2);
    });
  });

  describe('Batch operations helpers', () => {
    it('should calculate total reward correctly', () => {
      const tasks: BatchTaskInput[] = [
        {
          title: 'Task 1',
          descriptionURI: 'ipfs://t1',
          requiredCapabilities: ['a'],
          reward: parseEther('10'),
          deadline: 0n,
          requiresHumanVerification: false,
        },
        {
          title: 'Task 2',
          descriptionURI: 'ipfs://t2',
          requiredCapabilities: ['b'],
          reward: parseEther('20'),
          deadline: 0n,
          requiresHumanVerification: false,
        },
        {
          title: 'Task 3',
          descriptionURI: 'ipfs://t3',
          requiredCapabilities: ['c'],
          reward: parseEther('30'),
          deadline: 0n,
          requiresHumanVerification: false,
        },
      ];

      const total = tasks.reduce((sum, t) => sum + t.reward, 0n);
      expect(total).toBe(parseEther('60'));
    });
  });

  describe('Template batch creation', () => {
    it('should generate proper titles array', () => {
      const baseTitle = 'Review PR';
      const prNumbers = [42, 43, 44, 45];
      const titles = prNumbers.map((n) => `${baseTitle} #${n}`);

      expect(titles).toEqual([
        'Review PR #42',
        'Review PR #43',
        'Review PR #44',
        'Review PR #45',
      ]);
    });
  });

  describe('BatchManager class', () => {
    it('should be constructible with mock clients', () => {
      const mockPublicClient = {} as any;
      const mockWalletClient = {} as any;
      const address = '0x1234567890123456789012345678901234567890' as const;

      const manager = new BatchManager(mockPublicClient, mockWalletClient, address);
      expect(manager).toBeDefined();
    });
  });
});
