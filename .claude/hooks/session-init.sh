#!/bin/bash
# Session initialization hook for borealis-fabrics
# This script runs automatically when a new Claude Code session starts

PROJECT_ROOT="/Users/qinyuan/claude/r1ckyIn_GitHub/borealis-fabrics"
PARENT_ROOT="/Users/qinyuan/claude/r1ckyIn_GitHub"

# Output context for Claude to understand
cat << 'EOF'
================================================================================
SESSION INITIALIZATION - BOREALIS FABRICS
================================================================================

⚠️ MANDATORY: Before responding to any user request, Claude MUST:

1. UNDERSTAND THE PROJECT
   - This is a NestJS + React + TypeScript fabric trading management system
   - Read CLAUDE.md for current development status and tech decisions
   - Check the "当前功能状态" table for progress tracking

2. UNDERSTAND ALL RULES
   - Project rules: .claude/rules/ (30 files total)
   - Parent rules are symlinked and auto-loaded
   - Key rules: development-cycle, git-workflow, security checks

3. STRICT WORKFLOW COMPLIANCE
   - Never skip planning phase
   - One feature at a time (TDD approach)
   - Build → Test → Lint after every change
   - Use /commit for commits, never direct git commit
   - Use /code-review before merging

4. PLUGIN USAGE
   - feature-dev: For complex feature development
   - code-simplifier: For code cleanup
   - LSP plugins: Auto-enabled for language support

================================================================================
EOF

# Show current git status
echo "Current Branch: $(cd "$PROJECT_ROOT" && git branch --show-current)"
echo "Last Commit: $(cd "$PROJECT_ROOT" && git log -1 --oneline)"
echo ""

exit 0
