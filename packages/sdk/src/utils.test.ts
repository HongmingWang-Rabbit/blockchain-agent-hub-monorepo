import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import {
  generateAgentId,
  generateTaskId,
  formatReputation,
  calculatePlatformFee,
  calculateAgentPayout,
  STANDARD_CAPABILITIES,
  isValidMetadataURI,
  ipfsToGatewayUrl,
  TASK_STATUS_LABELS,
  isTaskAcceptable,
  canRequesterAct,
} from './utils';

describe('utils', () => {
  describe('generateAgentId', () => {
    it('should generate a valid hex agent ID', () => {
      const id = generateAgentId(
        '0x1234567890123456789012345678901234567890',
        'TestAgent',
        1234567890
      );
      expect(id).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate different IDs for different inputs', () => {
      const id1 = generateAgentId(
        '0x1234567890123456789012345678901234567890',
        'Agent1',
        1234567890
      );
      const id2 = generateAgentId(
        '0x1234567890123456789012345678901234567890',
        'Agent2',
        1234567890
      );
      expect(id1).not.toBe(id2);
    });

    it('should generate same ID for same inputs', () => {
      const id1 = generateAgentId(
        '0x1234567890123456789012345678901234567890',
        'TestAgent',
        1234567890
      );
      const id2 = generateAgentId(
        '0x1234567890123456789012345678901234567890',
        'TestAgent',
        1234567890
      );
      expect(id1).toBe(id2);
    });
  });

  describe('generateTaskId', () => {
    it('should generate a valid hex task ID', () => {
      const id = generateTaskId(
        '0x1234567890123456789012345678901234567890',
        'TestTask',
        1234567890
      );
      expect(id).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate different IDs for different inputs', () => {
      const id1 = generateTaskId(
        '0x1234567890123456789012345678901234567890',
        'Task1',
        1234567890
      );
      const id2 = generateTaskId(
        '0x1234567890123456789012345678901234567890',
        'Task2',
        1234567890
      );
      expect(id1).not.toBe(id2);
    });
  });

  describe('formatReputation', () => {
    it('should format 0 reputation', () => {
      expect(formatReputation(0)).toBe('0.00%');
    });

    it('should format 100% reputation', () => {
      expect(formatReputation(10000)).toBe('100.00%');
    });

    it('should format partial reputation', () => {
      expect(formatReputation(9500)).toBe('95.00%');
      expect(formatReputation(7532)).toBe('75.32%');
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate 5% fee correctly', () => {
      const reward = parseEther('100');
      const fee = calculatePlatformFee(reward, 5);
      expect(fee).toBe(parseEther('5'));
    });

    it('should calculate 2.5% fee correctly', () => {
      const reward = parseEther('100');
      const fee = calculatePlatformFee(reward, 2.5);
      expect(fee).toBe(parseEther('2.5'));
    });

    it('should return 0 for 0% fee', () => {
      const reward = parseEther('100');
      const fee = calculatePlatformFee(reward, 0);
      expect(fee).toBe(0n);
    });
  });

  describe('calculateAgentPayout', () => {
    it('should calculate payout after 5% fee', () => {
      const reward = parseEther('100');
      const payout = calculateAgentPayout(reward, 5);
      expect(payout).toBe(parseEther('95'));
    });

    it('should return full amount for 0% fee', () => {
      const reward = parseEther('100');
      const payout = calculateAgentPayout(reward, 0);
      expect(payout).toBe(parseEther('100'));
    });
  });

  describe('STANDARD_CAPABILITIES', () => {
    it('should have all expected capabilities', () => {
      expect(STANDARD_CAPABILITIES.TEXT_GENERATION).toBe('text-generation');
      expect(STANDARD_CAPABILITIES.CODE_REVIEW).toBe('code-review');
      expect(STANDARD_CAPABILITIES.SMART_CONTRACT_AUDIT).toBe('smart-contract-audit');
      expect(STANDARD_CAPABILITIES.IMAGE_GENERATION).toBe('image-generation');
    });
  });

  describe('isValidMetadataURI', () => {
    it('should accept IPFS URIs', () => {
      expect(isValidMetadataURI('ipfs://QmTest123')).toBe(true);
      expect(isValidMetadataURI('ipfs://bafybeigtest')).toBe(true);
    });

    it('should accept HTTPS URIs', () => {
      expect(isValidMetadataURI('https://example.com/metadata.json')).toBe(true);
      expect(isValidMetadataURI('https://api.example.com/agent/123')).toBe(true);
    });

    it('should reject HTTP URIs', () => {
      expect(isValidMetadataURI('http://example.com/metadata.json')).toBe(false);
    });

    it('should reject other URIs', () => {
      expect(isValidMetadataURI('ftp://example.com/file')).toBe(false);
      expect(isValidMetadataURI('file:///path/to/file')).toBe(false);
      expect(isValidMetadataURI('random-string')).toBe(false);
    });
  });

  describe('ipfsToGatewayUrl', () => {
    it('should convert IPFS URI to gateway URL', () => {
      const url = ipfsToGatewayUrl('ipfs://QmTest123');
      expect(url).toBe('https://ipfs.io/ipfs/QmTest123');
    });

    it('should use custom gateway', () => {
      const url = ipfsToGatewayUrl('ipfs://QmTest123', 'https://gateway.pinata.cloud/ipfs/');
      expect(url).toBe('https://gateway.pinata.cloud/ipfs/QmTest123');
    });

    it('should return non-IPFS URIs unchanged', () => {
      const url = ipfsToGatewayUrl('https://example.com/file.json');
      expect(url).toBe('https://example.com/file.json');
    });
  });

  describe('TASK_STATUS_LABELS', () => {
    it('should have labels for all statuses', () => {
      expect(TASK_STATUS_LABELS[0]).toBe('Open');
      expect(TASK_STATUS_LABELS[1]).toBe('Assigned');
      expect(TASK_STATUS_LABELS[4]).toBe('Completed');
      expect(TASK_STATUS_LABELS[6]).toBe('Cancelled');
    });
  });

  describe('isTaskAcceptable', () => {
    it('should return true for Open tasks', () => {
      expect(isTaskAcceptable(0)).toBe(true);
    });

    it('should return false for non-Open tasks', () => {
      expect(isTaskAcceptable(1)).toBe(false);
      expect(isTaskAcceptable(2)).toBe(false);
      expect(isTaskAcceptable(4)).toBe(false);
    });
  });

  describe('canRequesterAct', () => {
    it('should return true for Submitted status', () => {
      expect(canRequesterAct(2)).toBe(true);
    });

    it('should return true for PendingReview status', () => {
      expect(canRequesterAct(3)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(canRequesterAct(0)).toBe(false);
      expect(canRequesterAct(1)).toBe(false);
      expect(canRequesterAct(4)).toBe(false);
    });
  });
});
