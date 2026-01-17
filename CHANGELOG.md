# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-01-17

### Added
- **Reliable ID resolution for library variables**: All library variables now include `id` and `nodeId` fields via automatic import strategy using `importVariableByKeyAsync`
- **Method tracking**: Each variable now includes a `method` field indicating how it was resolved (`local_or_alias`, `imported`)
- **Enhanced summary statistics**: Added `resolutionMethods` breakdown showing counts per resolution method
- **Improved tool documentation**: Updated `figma_get_library_variables` description to reflect reliable ID resolution

### Changed
- **Strategy 3 (Import)**: Now uses `figma.variables.importVariableByKeyAsync()` to explicitly import library variables into file context, making their IDs accessible
- **Simplified resolution flow**: Removed ineffective constructed ID strategy, streamlining to 3 working strategies

### Removed
- **Strategy 3 (Constructed ID)**: Removed ineffective ID construction strategy that never successfully resolved variables (0% success rate)
- **Dead code cleanup**: Removed ~50 lines of unused code related to constructed ID attempts

### Fixed
- **100% ID resolution**: Library variables now reliably have IDs, even when not yet referenced in the current file
- **Improved reliability**: All 307/307 variables successfully resolved in testing (previously many had `null` IDs)

## [1.1.0] - Previous Release

### Added
- Initial release with library variable support
- Basic ID resolution for referenced variables

---

## Notes for Contributors

When contributing to this repository, remember to:
- Update remote server URLs if deploying your own server (replace `figma-console-mcp.southleft.com`)
- Update OAuth callback URLs in deployment configuration if self-hosting
