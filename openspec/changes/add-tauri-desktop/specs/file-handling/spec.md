## ADDED Requirements
### Requirement: Desktop File System Access
The application SHALL provide desktop-specific file system access capabilities when running as a Tauri desktop application.

#### Scenario: Local file saving
- **WHEN** user saves a diagram in the desktop application
- **THEN** the diagram is saved directly to the local file system without requiring web browser downloads

#### Scenario: Local file opening
- **WHEN** user opens a diagram in the desktop application
- **THEN** the diagram is loaded directly from the local file system

#### Scenario: Directory listing
- **WHEN** user browses for diagrams in the desktop application
- **THEN** the application can list and access diagrams from local directories