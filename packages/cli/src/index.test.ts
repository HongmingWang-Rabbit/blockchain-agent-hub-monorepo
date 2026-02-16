import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';

// Helper to run CLI commands
function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const cliPath = path.join(__dirname, '../dist/index.js');
    const proc = spawn('node', [cliPath, ...args], {
      env: { ...process.env, NO_COLOR: '1' }, // Disable chalk colors for testing
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

describe('CLI', () => {
  describe('Basic Commands', () => {
    it('should show version with --version', async () => {
      const { stdout, code } = await runCLI(['--version']);
      expect(stdout.trim()).toBe('0.1.0');
      expect(code).toBe(0);
    });

    it('should show help with --help', async () => {
      const { stdout, code } = await runCLI(['--help']);
      expect(stdout).toContain('CLI for Blockchain Agent Hub on HashKey Chain');
      expect(stdout).toContain('token');
      expect(stdout).toContain('agent');
      expect(stdout).toContain('task');
      expect(stdout).toContain('price');
      expect(stdout).toContain('nft');
      expect(stdout).toContain('workflow');
      expect(stdout).toContain('crosschain');
      expect(stdout).toContain('gov');
      expect(stdout).toContain('status');
      expect(code).toBe(0);
    });
  });

  describe('Status Command', () => {
    it('should display network and contract info', async () => {
      const { stdout, code } = await runCLI(['status']);
      
      // Network info
      expect(stdout).toContain('HashKey Testnet');
      expect(stdout).toContain('Chain ID: 133');
      expect(stdout).toContain('https://hashkeychain-testnet.alt.technology');
      
      // Contract addresses
      expect(stdout).toContain('agntToken');
      expect(stdout).toContain('agentRegistry');
      expect(stdout).toContain('taskMarketplace');
      expect(stdout).toContain('0x7379C9d687F8c22d41be43fE510F8225afF253f6'); // AGNT Token
      expect(stdout).toContain('0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49'); // Registry
      
      // Webapp URL
      expect(stdout).toContain('webapp-nine-flax.vercel.app');
      
      expect(code).toBe(0);
    });
  });

  describe('Token Commands', () => {
    it('should show token help', async () => {
      const { stdout, code } = await runCLI(['token', '--help']);
      expect(stdout).toContain('AGNT token operations');
      expect(stdout).toContain('balance');
      expect(stdout).toContain('transfer');
      expect(stdout).toContain('approve');
      expect(code).toBe(0);
    });
  });

  describe('Agent Commands', () => {
    it('should show agent help', async () => {
      const { stdout, code } = await runCLI(['agent', '--help']);
      expect(stdout).toContain('Agent registry operations');
      expect(stdout).toContain('list');
      expect(stdout).toContain('info');
      expect(stdout).toContain('register');
      expect(code).toBe(0);
    });
  });

  describe('Task Commands', () => {
    it('should show task help', async () => {
      const { stdout, code } = await runCLI(['task', '--help']);
      expect(stdout).toContain('Task marketplace operations');
      expect(stdout).toContain('list');
      expect(stdout).toContain('create');
      expect(code).toBe(0);
    });
  });

  describe('Price Commands', () => {
    it('should show price help', async () => {
      const { stdout, code } = await runCLI(['price', '--help']);
      expect(stdout).toContain('Dynamic pricing operations');
      expect(stdout).toContain('calculate');
      expect(code).toBe(0);
    });
  });

  describe('NFT Commands', () => {
    it('should show nft help', async () => {
      const { stdout, code } = await runCLI(['nft', '--help']);
      expect(stdout).toContain('Agent NFT operations');
      expect(stdout).toContain('view');
      expect(code).toBe(0);
    });
  });

  describe('Workflow Commands', () => {
    it('should show workflow help', async () => {
      const { stdout, code } = await runCLI(['workflow', '--help']);
      expect(stdout).toContain('Workflow operations');
      expect(stdout).toContain('list');
      expect(code).toBe(0);
    });
  });

  describe('Cross-Chain Commands', () => {
    it('should show crosschain help', async () => {
      const { stdout, code } = await runCLI(['crosschain', '--help']);
      expect(stdout).toContain('Cross-chain operations');
      expect(stdout).toContain('broadcast');
      expect(code).toBe(0);
    });
  });

  describe('Governance Commands', () => {
    it('should show gov help', async () => {
      const { stdout, code } = await runCLI(['gov', '--help']);
      expect(stdout).toContain('Governance operations');
      expect(stdout).toContain('treasury');
      expect(stdout).toContain('delegate');
      expect(code).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should show error for unknown command', async () => {
      const { stderr, code } = await runCLI(['unknowncommand']);
      expect(stderr).toContain('error');
      expect(code).not.toBe(0);
    });
  });
});
