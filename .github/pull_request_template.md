name: Pull Request Template
description: Template for creating pull requests
body:

- type: markdown
  attributes:
  value: | # Pull Request Guidelines

      Thank you for contributing to Universal MCP Server! Please fill out this template to help us review your changes efficiently.

- type: textarea
  id: description
  attributes:
  label: Description
  description: Brief description of changes made
  placeholder: |
  Add a clear and concise description of what this PR changes and why.
  Include the problem being solved and the approach taken.
  validations:
  required: true

- type: textarea
  id: testing
  attributes:
  label: Testing
  description: How have you tested these changes?
  placeholder: | - [ ] Added unit tests for new functionality - [ ] Added integration tests if applicable - [ ] Manual testing performed - [ ] All existing tests pass - [ ] Code coverage maintained or improved
  validations:
  required: true

- type: checkboxes
  id: type-of-change
  attributes:
  label: Type of Change
  description: What type of change is this?
  options: - label: 🐛 Bug fix (non-breaking change that fixes an issue) - label: ✨ New feature (non-breaking change that adds functionality) - label: 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected) - label: 📚 Documentation update - label: 🎨 Code style change (formatting, missing semicolons, etc) - label: ♻️ Code refactoring (no functional changes) - label: ⚡ Performance improvement - label: 🔧 Build/CI/CD improvement
  validations:
  required: true

- type: dropdown
  id: scope
  attributes:
  label: Scope of Changes
  description: Which area(s) does this PR affect?
  multiple: true
  options: - Core Server - Client Library - Transport Protocols - Plugin System - Built-in Tools - Security - Performance/Monitoring - Documentation - Examples - Tests - CI/CD - Build System
  validations:
  required: true

- type: textarea
  id: breaking-changes
  attributes:
  label: Breaking Changes
  description: If this is a breaking change, please describe the impact and migration path
  placeholder: |
  **Breaking Changes:** - [Specific change 1]: [Impact description] - [Specific change 2]: [Impact description]

      **Migration Path:**
      [Steps for users to migrate their code]

  render: markdown

- type: textarea
  id: api-changes
  attributes:
  label: API Changes
  description: If this PR changes public APIs, please document them
  placeholder: |
  **New APIs:** - `Class.method()` - [Description]

      **Modified APIs:**
      - `Class.method()` - [Description of changes]

      **Removed APIs:**
      - `Class.method()` - [Reason for removal]

  render: markdown

- type: textarea
  id: screenshots
  attributes:
  label: Screenshots / Videos
  description: Add screenshots or videos if applicable
  placeholder: Drag and drop images here to illustrate your changes

- type: textarea
  id: checklist
  attributes:
  label: Checklist
  description: Please confirm you've completed the following
  value: | - [ ] My code follows the project's coding standards - [ ] I have performed a self-review of my own code - [ ] I have commented my code, particularly in hard-to-understand areas - [ ] I have made corresponding changes to the documentation - [ ] My changes generate no new warnings - [ ] I have added tests that prove my fix is effective or that my feature works - [ ] New and existing unit tests pass locally with my changes - [ ] Any dependent changes have been merged and published in downstream modules - [ ] I have checked that the PR targets the correct branch (main for features, release-x.x.x for bugfixes)
  validations:
  required: true

- type: textarea
  id: additional-notes
  attributes:
  label: Additional Notes
  description: Any additional context or notes for reviewers

- type: markdown
  attributes:
  value: | ## Reviewer Guidelines

      Reviewers should check for:
      - ✅ Code quality and adherence to project standards
      - ✅ Test coverage and test quality
      - ✅ Documentation updates
      - ✅ Breaking changes and migration path
      - ✅ Security considerations
      - ✅ Performance implications
      - ✅ Compatibility with existing APIs

      ## Release Notes

      If this PR will be included in release notes, please suggest a one-line summary:

      > **Suggested release note:** [Your summary of the change]
