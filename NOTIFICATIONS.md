# Notification System Guide

Village Defense: Idleo uses two distinct types of notifications to provide appropriate user feedback:

## 🍞 Toast Notifications (`showToast`)

**Use for:** Brief, informational messages that don't require user action
- Building placements
- Resource generation
- Status changes
- Progress updates
- Non-critical alerts

**Characteristics:**
- Appears in top-right corner
- Auto-dismisses after 2-3 seconds
- Doesn't block gameplay
- Can be clicked to dismiss early
- Multiple toasts can stack

**Usage:**
```javascript
window.showToast('Building placed successfully!', {
    icon: '🏠',
    type: 'success',  // success, error, warning, info, building
    timeout: 3000     // optional, defaults to 3000ms
});
```

**Example Use Cases:**
- ✅ "House construction started!" 
- ✅ "Village produced: 15 food, 8 wood"
- ✅ "Battle started! Commander Elena commanding"
- ✅ "View unlocked: Battle mode available"

## 📢 Modal Dialogs (`showModal`)

**Use for:** Important information that requires user attention and acknowledgment
- Battle results (victory/defeat)
- Tutorial instructions
- Critical errors
- Game-changing events
- Confirmation dialogs

**Characteristics:**
- Centers on screen with backdrop
- Blocks interaction until dismissed
- Must be acknowledged with OK/Cancel
- Returns a Promise for user response
- Can include formatted HTML content

**Usage:**
```javascript
window.showModal(
    'Battle Victory!',
    '<p><strong>Wave 3 completed!</strong></p><p>💰 Gold earned: 150</p>',
    { 
        type: 'success',      // success, error, warning, info, question
        icon: '🏆',          // optional custom icon
        showCancel: false    // optional, shows Cancel button
    }
).then(confirmed => {
    if (confirmed) {
        // User clicked OK
    } else {
        // User clicked Cancel or pressed Escape
    }
});
```

**Example Use Cases:**
- ✅ Battle victory/defeat with detailed results
- ✅ Tutorial welcome message
- ✅ "Are you sure you want to reset the game?"
- ✅ Critical errors requiring user action
- ✅ Achievement unlocks with detailed rewards

## 🎮 Demo Controls

Press these keys in-game to see examples:
- **T** - Show toast notification example
- **M** - Show modal dialog example

## 🎨 Styling

Toast notifications use the game's color scheme:
- `success`: Green (#27ae60)
- `error`: Red (#e74c3c) 
- `warning`: Orange (#f39c12)
- `info`: Blue (#3498db)
- `building`: Purple (#9b59b6)

Modal dialogs automatically adapt their border color based on type.

## 🧠 Decision Guide

**Use Toast when:**
- User doesn't need to stop what they're doing
- Information is supplementary
- Action has already completed successfully
- Message is brief (1-2 lines)

**Use Modal when:**
- User needs to acknowledge important information
- Information affects game progression
- Decision/confirmation is required
- Context or detailed explanation is needed

## 💡 Best Practices

1. **Don't overuse toasts** - Avoid showing them too frequently
2. **Keep toast messages short** - 1-2 lines maximum
3. **Use appropriate icons** - Visual context helps understanding
4. **Modal for tutorials** - Important learning information needs focus
5. **Modal for results** - Battle outcomes, achievements deserve attention
6. **Toast for status** - Building placed, resources gained, etc.
