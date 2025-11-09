# AI Issues & Bug Reports 🐛

Tracking of known issues, bugs, and technical blockers for the Zenith Tasks project.

## Purpose

This directory documents:
- Active bugs and issues
- Known limitations and workarounds
- Blockers and dependencies
- Performance issues and bottlenecks
- Security concerns and vulnerabilities

## Status Categories

- **🔴 Critical** - Production-blocking issues
- **🟠 High** - Significant impact on functionality
- **🟡 Medium** - Notable issues with workarounds
- **🟢 Low** - Minor issues, cosmetic problems
- **✅ Resolved** - Documented for historical reference

## Issue Tracking

Files are organized by:
1. **Priority level** (Critical → Low)
2. **Date discovered** (most recent first)
3. **Component affected**

### Current Issues

#### Test Infrastructure
- **Status**: 🟡 Medium
- **Issue**: Missing test dependencies (@types/jest, @testing-library/react)
- **Impact**: TypeScript errors in test files
- **Workaround**: Can be installed when test infrastructure is needed
- **See**: CLAUDE.md line 72

#### Build Warnings
- **Status**: 🟢 Low
- **Issue**: Multiple lockfiles detected (parent directory)
- **Impact**: Build warnings about workspace root inference
- **Solution**: Remove parent lockfile or configure turbopack.root

## Issue Resolution Process

When resolving issues:
1. Document the root cause
2. Implement the fix
3. Add tests to prevent regression
4. Update this tracking document
5. Move resolved issue to archive
6. Reference the fix in commit message

## Resolved Issues Archive

- [ARCHIVE/](./ARCHIVE/) - Historical issues and resolutions

## Last Updated

2025-11-09

---

**Maintained by**: Claude Code AI Assistant
