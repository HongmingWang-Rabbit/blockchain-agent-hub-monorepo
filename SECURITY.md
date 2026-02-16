# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Blockchain Agent Hub, please report it responsibly.

### For Critical Issues (Smart Contract Vulnerabilities)

**DO NOT** open a public issue. Instead:

1. Email the maintainer directly
2. Include detailed steps to reproduce
3. Allow reasonable time for a fix before public disclosure

### What Qualifies as a Security Issue

- Smart contract vulnerabilities (reentrancy, overflow, access control, etc.)
- Fund loss or theft vectors
- Unauthorized state manipulation
- Private key exposure risks
- Front-running vulnerabilities

### What Is NOT a Security Issue

- Gas optimization suggestions
- UI/UX bugs
- Documentation errors
- Feature requests

## Security Measures

### Smart Contracts

- Built on OpenZeppelin contracts (audited, battle-tested)
- Role-based access control (RBAC)
- Pausable functionality for emergencies
- Timelock for governance actions
- Reentrancy guards on all external calls

### Best Practices

- All state changes emit events
- Input validation on all public functions
- Separation of concerns between contracts
- Comprehensive test coverage (156+ tests)

## Audit Status

⚠️ **These contracts have not been formally audited.** Use at your own risk on mainnet.

We welcome security researchers to review our code and report issues responsibly.

## Bug Bounty

Currently, there is no formal bug bounty program. However, we greatly appreciate responsible disclosure and will acknowledge contributors.
