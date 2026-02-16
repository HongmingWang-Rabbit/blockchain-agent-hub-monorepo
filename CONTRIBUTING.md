# Contributing to Blockchain Agent Hub

Thank you for your interest in contributing! This document provides guidelines and instructions.

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Installation

```bash
# Clone the repo
git clone https://github.com/HongmingWang-Rabbit/blockchain-agent-hub-monorepo.git
cd blockchain-agent-hub-monorepo

# Install all dependencies (monorepo workspaces)
npm install
```

### Project Structure

```
packages/
├── contracts/   # Solidity smart contracts (Hardhat)
├── sdk/         # TypeScript SDK for contract interaction
├── cli/         # Command-line interface
└── webapp/      # Next.js frontend
```

## 🧪 Running Tests

### Smart Contracts

```bash
cd packages/contracts

# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

### SDK

```bash
cd packages/sdk

# Run tests
npm test

# Run tests in watch mode
npm run dev
```

### CLI

```bash
cd packages/cli

# Build and test
npm run build
node dist/index.js --help
```

### Webapp

```bash
cd packages/webapp

# Development server
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

## 📝 Code Style

### Solidity

- Use Solidity 0.8.20+
- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use NatSpec comments for all public functions
- Write comprehensive tests for all functionality

### TypeScript

- Use TypeScript strict mode
- Export types alongside implementations
- Use `viem` for Ethereum interactions (not ethers.js in SDK)
- Document public APIs with JSDoc

### Commit Messages

We use conventional commits:

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
test: Add or update tests
chore: Maintenance tasks
ci: CI/CD changes
```

## 🔄 Pull Request Process

1. **Fork and branch** — Create a feature branch from `main`
2. **Write tests** — Add tests for new functionality
3. **Run all tests** — Ensure CI passes locally
4. **Update docs** — Update README if needed
5. **Submit PR** — Include description of changes

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Contracts compile (`npx hardhat compile`)
- [ ] SDK builds (`npm run build` in packages/sdk)
- [ ] Webapp builds (`npm run build` in packages/webapp)
- [ ] Documentation updated if needed

## 🐛 Bug Reports

Open an issue with:

1. **Description** — Clear explanation of the bug
2. **Steps to reproduce** — Minimal reproduction steps
3. **Expected behavior** — What should happen
4. **Actual behavior** — What actually happens
5. **Environment** — OS, Node version, etc.

## 💡 Feature Requests

Open an issue with:

1. **Problem statement** — What problem does this solve?
2. **Proposed solution** — How would you implement it?
3. **Alternatives** — Other approaches considered

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Your contributions help make Blockchain Agent Hub better for everyone!
