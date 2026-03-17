# Agent Guidelines for vite-plugin-merge-css

This document provides essential information for AI agents and developers working on this repository.

## Commands

### Build and Development
- **Build the project**: `npm run build` (Uses `tsdown` to bundle)
- **Development mode**: `npm run dev` (Watches for changes)
- **Local packaging**: `npm run pack-local` (Builds and creates a .tgz for local testing)
- **Changelog generation**: `npm run create-changelog`

### Quality Control
- **Lint everything**: `npm run lint` (Runs Prettier check, oxlint, and Type checking)
- **Prettier only**: `npx prettier --write .`
- **oxlint only**: `npx oxlint`
- **Type check only**: `npx tsc`

### Testing
- **Run all tests**: `npm run test` (Runs Vitest with coverage)
- **Run a single test**: `npx vitest src/plugin.test.ts`
- **Run tests in watch mode**: `npx vitest`

## Code Style Guidelines

### Environment
- **Node Version**: >=22.12.0 (as specified in `package.json`).
- **Dependencies**: Use `npm`. Avoid adding unnecessary dependencies. `debug` is available for logging.

### General Principles
- **Keep it Simple**: The plugin is focused on a single task. Avoid over-engineering.
- **Vite/Rollup Context**: Use the standard `this.warn` and `this.error` methods within Rollup hooks.
- **Compatibility**: Ensure compatibility with Node 22.12.0+ and Vite 7.0.0+.

### Formatting (Enforced by Prettier)
- **Indentation**: Use **Tabs**.
- **Quotes**: Use **Single Quotes** for strings in TypeScript files.
- **Semi-colons**: Always include semi-colons.
- **Print Width**: 160 characters.
- **Bracket Spacing**: No spacing inside brackets (e.g., `{foo}` instead of `{ foo }`).

### TypeScript and Types
- **Strict Mode**: `strict: true` is enabled in `tsconfig.json`. Ensure all new code passes strict checks.
- **Type Imports**: Use the `type` qualifier for type-only imports:
  ```typescript
  import {type Plugin, type Rollup} from 'vite';
  ```
- **Explicit Returns**: Provide explicit return types for all exported functions and factory methods.
- **Naming**:
  - `camelCase` for variables, functions, and properties.
  - `PascalCase` for the main plugin function (`VitePluginMergeCss`).
  - `type` definitions should be clear and descriptive (e.g., `ViteMetadata`, `CssCollector`).

### Error Handling
- Use `throw new Error('message')` for internal logic errors that should stop the build.
- Use `this.warn('message')` within Vite hooks for non-fatal issues.
- Always provide descriptive error messages that help the user identify which file or chunk caused the problem.

### Documentation
- Use **JSDoc** for all exported functions and types.
- Focus comments on "why" rather than "what".
- Ensure the `README.md` is updated if any configuration options or behaviors change.

## Architecture

### Project Structure
- `src/index.ts`: Entry point of the plugin.
- `src/css-collector.ts`: Logic for traversing the Rollup bundle to find CSS dependencies.
- `src/util.ts`: Utility functions.
- `example/`: A sample project to manually verify the plugin behavior.

### Plugin Logic
The plugin operates during the `generateBundle` hook. It:
1. Identifies entry chunks using `output.isEntry`.
2. Uses `CssCollector` to recursively find all CSS assets imported by the entry chunk and its dependencies. It follows the `imports` array of chunks and looks into `viteMetadata.importedCss`.
3. Concatenates the CSS content from all identified assets.
4. Emits a new CSS file named after the entry chunk (replacing `.js` with `.css`) using `this.emitFile`.

### Key Dependencies
- **tsdown**: Used for bundling the library itself.
- **vitest**: Used for unit testing.
- **debug**: Used for internal logging. Enable with `DEBUG=vite-plugin-merge-css`.
- **vite**: Peer dependency, specifically targeted at version 7+ and 8+.

## Working with Examples
When testing changes, you can use the `example/` directory.
1. `cd example`
2. `npm install` (links to the local version)
3. `npm run build`
4. Inspect the `dist` directory to verify CSS merging.
