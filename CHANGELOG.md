# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial monorepo setup with pnpm workspaces + Turborepo
- Shared TypeScript, ESLint (flat config), and Prettier configurations
- Demo library: `@cocoar/vue-core` (utility library)
- Demo library: `@cocoar/vue-button` (Vue component with Storybook story)
- Centralized Storybook 10 with `@storybook/vue3-vite`
- Vitest for unit testing across packages
- Vite library mode builds with externalized Vue
