# Dynasty Builder - Project Refactoring & Architecture Guide

## 🏗️ Project Structure Overview

This document outlines the new organized structure of the Dynasty Builder codebase, designed for maintainability, scalability, and debugging ease.

## 📁 Folder Structure

```
/workspaces/ng/
├── src/
│   ├── systems/           # Core game systems organized by functionality
│   │   ├── core/         # Fundamental systems (EventBus, GameState)
│   │   ├── ui/           # User interface components (Modals, Popups)
│   │   ├── gameplay/     # Game mechanics (Village, Battle, Quest)
│   │   └── features/     # Specific features (Tutorial, Achievements)
│   ├── utils/            # Utility functions and helpers
│   ├── config/           # Configuration files and constants
│   └── types/            # Type definitions (for future TypeScript)
├── public/               # Static assets and HTML files
├── docs/                 # Documentation and screenshots
│   ├── architecture/     # System architecture docs
│   ├── screenshots/      # Visual system documentation
│   └── api/             # API/function documentation
├── tests/               # Test files organized by system
├── debug/               # Debug tools and utilities
└── scripts/             # Build and utility scripts
```

## 🎯 System Organization Principles

### 1. **Separation of Concerns**
- Each system has a single, well-defined responsibility
- Dependencies are explicitly managed through imports
- Systems communicate through the EventBus pattern

### 2. **Hierarchical Structure**
- Core systems (EventBus, GameState) at the foundation
- UI systems depend on core but not gameplay
- Gameplay systems use both core and UI
- Features integrate multiple systems

### 3. **Documentation-First Approach**
- Each system includes comprehensive JSDoc comments
- Visual documentation with screenshots
- Architecture diagrams for complex interactions

## 🔧 Development Best Practices

### File Organization
- One class/system per file
- Clear naming conventions
- Consistent folder structure
- Import/export patterns

### Error Handling
- Try-catch blocks in all event handlers
- Graceful degradation for missing dependencies
- Comprehensive logging for debugging

### State Management
- Centralized state in GameState
- Event-driven updates
- Immutable data patterns where possible

## 🐛 Debugging Strategy

### 1. **System Health Monitoring**
```javascript
// Each system exposes health check
system.getHealth() // Returns status object
```

### 2. **Event Tracing**
```javascript
// EventBus logs all events
eventBus.enableTracing(true)
```

### 3. **State Snapshots**
```javascript
// GameState provides snapshots
gameState.createSnapshot()
gameState.restoreSnapshot(snapshot)
```

## 📸 Visual System Documentation

Each major system includes:
- Screenshot of its UI elements
- State diagrams showing data flow
- Interaction diagrams showing dependencies

## 🔄 Migration Path

1. **Phase 1**: Copy existing files to new structure
2. **Phase 2**: Update import/export statements
3. **Phase 3**: Add comprehensive documentation
4. **Phase 4**: Implement debugging tools
5. **Phase 5**: Add automated tests

## 🚨 Error Recovery System

### Auto-Recovery Features:
- State validation on load
- Fallback to default values
- System restart capabilities
- User notification for critical errors

### Manual Recovery Tools:
- Browser developer console
- State editor interface
- System reset buttons
- Export/import functionality

This architecture ensures the codebase remains maintainable while providing robust debugging and recovery capabilities.
