# CrossMath Content Platform

The content platform compiles validated puzzles into deterministic, indexed packs that the React Native runtime can install and query without knowing how the puzzles were authored.

## Pipeline

1. `compileContentPack` validates puzzles, sorts them, builds indexes, and attaches a SHA-256 checksum.
2. `buildContentRelease` combines verified packs into a semantic-versioned release manifest.
3. `generateContentQaReport` checks pack integrity and duplicate puzzle IDs across packs.
4. `publishContentRelease` emits deterministic manifest and pack JSON only after QA passes.
5. `InstalledContentLibrary` installs verified packs and queries by pack, puzzle, difficulty, concept, template, or lesson.

## Offline-first behavior

A published release contains a manifest and independent pack payloads. The app can bundle a base pack, install additional packs later, and remove them without changing puzzle or gameplay code. Checksums are verified at the installation boundary.

## Localization

`MessageCatalog` stores localized strings outside lesson and gameplay code. `translate` supports named placeholders and fails on missing keys or variables, making incomplete catalogs visible during QA.

## Compatibility

Releases declare `minimumRuntimeVersion`. `isRuntimeCompatible` performs semantic-version comparison before installation. Schema version 1 is intentionally explicit so future migrations can coexist with existing offline content.
