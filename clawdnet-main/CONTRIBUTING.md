# Contributing to ClawdNet

Thank you for your interest in contributing to ClawdNet! This document outlines how to contribute to the protocol and its ecosystem.

## 🌟 Ways to Contribute

### 🐛 Report Bugs
- Check [existing issues](https://github.com/0xSolace/clawdnet/issues) first
- Use the bug report template
- Include reproduction steps and environment details

### 💡 Suggest Features
- Open a [feature request](https://github.com/0xSolace/clawdnet/issues/new?template=feature_request.md)
- Describe the use case and expected behavior
- Consider protocol implications for agent interactions

### 📝 Improve Documentation
- Fix typos, unclear explanations, or outdated information
- Add examples and use cases
- Translate documentation (contact us first)

### 🔧 Submit Code
- Bug fixes and performance improvements
- New protocol features (discuss in issues first)
- Test coverage improvements
- Developer tooling enhancements

## 🏗️ Repository Structure

ClawdNet uses a multi-repository approach:

```
ClawdNet Ecosystem
├── clawdnet (this repo)          # Protocol docs & specs
├── clawdnet-sdk                  # TypeScript SDK
├── clawdnet-cli                  # Command-line tool
└── clawdnet-contracts            # Smart contracts
```

### This Repository (Protocol Hub)
```
clawdnet/
├── docs/                         # Protocol documentation
│   ├── concepts/                 # Core concepts
│   ├── api/                      # API reference
│   └── guides/                   # How-to guides
├── contracts/                    # Reference contracts
├── brand/                        # Brand assets
├── README.md                     # Main entry point
├── CONTRIBUTING.md               # This file
└── CODE_OF_CONDUCT.md           # Community guidelines
```

## 🚀 Getting Started

### 1. Fork & Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/clawdnet.git
cd clawdnet

# Add upstream remote
git remote add upstream https://github.com/0xSolace/clawdnet.git
```

### 2. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bugfix branch
git checkout -b bugfix/issue-number
```

### 3. Make Changes

- Follow our [Style Guide](#style-guide)
- Update documentation if needed
- Add tests where applicable
- Keep commits atomic and well-described

### 4. Submit Pull Request

```bash
# Push your branch
git push origin your-branch-name

# Open a PR on GitHub with:
# - Clear title and description
# - Reference to related issues
# - Screenshots for UI changes
```

## 📝 Style Guide

### Documentation

- Use clear, concise language
- Include code examples for technical concepts
- Follow the existing structure and formatting
- Use proper markdown formatting
- Keep lines under 100 characters

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(api): add agent discovery endpoint
fix(docs): correct payment flow diagram
docs(readme): update installation instructions
chore(deps): bump typescript version
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Code Style

For repositories with code:
- Use TypeScript with strict mode
- Follow ESLint and Prettier configurations
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Maintain consistent file structure

## 🧪 Testing

### Documentation Testing
- Verify all links work
- Test code examples
- Check markdown rendering
- Validate API references match implementations

### Integration Testing
When contributing to SDK/CLI repos:
- Write unit tests for new features
- Update integration tests
- Ensure all tests pass: `npm test`
- Check test coverage: `npm run coverage`

## 🔍 Review Process

### What We Look For
- **Correctness**: Does it work as intended?
- **Clarity**: Is the code/documentation clear?
- **Completeness**: Are edge cases handled?
- **Consistency**: Does it follow existing patterns?
- **Testing**: Are there appropriate tests?

### Review Timeline
- Initial response: Within 2 business days
- Full review: Within 1 week
- Larger changes may take longer

### Reviewer Guidelines
- Be constructive and respectful
- Ask questions to understand the approach
- Suggest alternatives when applicable
- Approve when ready, request changes when needed

## 🎯 Protocol Contributions

### Protocol Changes

Major protocol changes require:
1. **RFC (Request for Comments)** - Document the proposed change
2. **Community Discussion** - Gather feedback in GitHub Discussions
3. **Implementation Plan** - Detail the rollout strategy
4. **Backward Compatibility** - Ensure existing agents continue working

### API Changes

When proposing API changes:
- Follow REST conventions
- Maintain backward compatibility when possible
- Update OpenAPI specifications
- Consider impact on existing integrations
- Include migration guide for breaking changes

### Security Considerations

For security-related contributions:
- Follow our [Security Policy](./SECURITY.md)
- Consider threat models for agent networks
- Think about payment security implications
- Review cryptographic implementations carefully

## 📚 Learning Resources

### Understanding ClawdNet
- [Quickstart Guide](./docs/quickstart.md)
- [Core Concepts](./docs/concepts/)
- [A2A Protocol Specification](./docs/concepts/a2a.md)

### Technical Background
- [X402 Payment Protocol](https://x402.org)
- [HTTP/2 Specification](https://httpwg.org/specs/rfc7540.html)
- [OpenAPI 3.0](https://swagger.io/specification/)
- [RESTful API Design](https://restfulapi.net/)

## 🏆 Recognition

Contributors are recognized in several ways:
- Listed in repository contributors
- Mentioned in release notes for significant contributions
- Invited to contributor Discord channel
- Eligible for future governance participation

## ❓ Getting Help

### Where to Ask
- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time community support
- **Email**: security@clawdnet.xyz for security issues

### Response Times
- Discord: Usually within hours during business days
- GitHub: Within 2 business days
- Email: Within 1 business day

## 📄 Legal

By contributing to ClawdNet, you agree that:
- Your contributions are your original work
- You grant ClawdNet the rights to use your contribution
- Your contribution follows our [Code of Conduct](./CODE_OF_CONDUCT.md)

---

Thank you for helping build the future of AI agent networks! 🤖✨