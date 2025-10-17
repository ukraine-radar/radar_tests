# Group Control System - Integration Guide

## Overview

The Group Control System (Режим вибору цілей) is a professional, modular solution for multi-target selection and management in the Leaflet + JS radar application. It provides desktop and mobile support with clean ES6 architecture, zero side-effects, and full accessibility.

**🔒 Admin-Only Feature**: This module is restricted to administrators only. Non-admin users cannot enable the mode and will not see the toggle button.

## Features

- **🔐 Admin-Only Access**: Feature is gated to administrators only
- **Desktop Selection**: Click to toggle, Shift+drag for box selection
- **Mobile Selection**: Tap to toggle, long-press (~0.45s) to start drag, nearest-marker hit-test (≈24px radius)
- **Performant Rendering**: Handles 1000+ targets smoothly with rAF throttling
- **Group Actions**: Course, Speed, Type, Delete, Clear
- **Exit Behavior**: Prominent "Вийти ×" button immediately disables mode and closes menu
- **Keyboard Support**: Esc to disable, Ctrl/Cmd+A to select all
- **Accessibility**: ARIA labels, focus-visible styling, reduced motion support
- **Responsive UI**: Adaptive bottom action bar with blur background
- **Popup Suppression**: Prevents marker popups from opening during selection mode

## Installation

### 1. Include CSS and JavaScript Files

Add the following to your HTML `<head>` section, after your existing stylesheets:

```html
<!-- Group Control System Styles -->
<link rel="stylesheet" href="groupControl.css">
```

Add the following before your closing `</body>` tag, after your existing scripts:

```html
<!-- Group Control System Module -->
<script src="groupControl.js"></script>
```

### 2. Add Toggle Button to Admin Panel

Add a toggle button to your admin panel (must be admin-only section):

```html
<button class="btn btn-margin admin-only" onclick="window.groupControl && window.groupControl.toggleGroupSelection()" id="toggleSelectionBtn" style="display: none;">
    <i class="fas fa-layer-group"></i>Режим вибору цілей
</button>
```

The button should:
- Have the `admin-only` class
- Be initially hidden with `style="display: none;"`
- Use the groupControl API for toggling
- Be placed in the admin panel section under the "Режим вибору цілей поганий" button

The module will automatically show/hide the button based on admin status.

## Public API

The module exposes a global `window.groupControl` object with the following methods:

### `enableGroupSelection()`

Enable group selection mode. Activates event listeners and shows the action bar.

```javascript
window.groupControl.enableGroupSelection();
```

### `disableGroupSelection()`

Disable group selection mode. Clears selection and hides the action bar.

```javascript
window.groupControl.disableGroupSelection();
```

### `toggleGroupSelection()`

Toggle group selection mode on/off.

```javascript
window.groupControl.toggleGroupSelection();
```

### `selectTarget(targetId)`

Programmatically select a target by ID.

```javascript
window.groupControl.selectTarget('target-123');
```

### `deselectTarget(targetId)`

Programmatically deselect a target by ID.

```javascript
window.groupControl.deselectTarget('target-123');
```

### `clearGroupSelection()`

Clear all selected targets.

```javascript
window.groupControl.clearGroupSelection();
```

### `refreshBindings()`

Refresh event bindings to markers. Useful when markers are dynamically added/removed.

```javascript
window.groupControl.refreshBindings();
```

## Admin Access Control

The Group Control system is **admin-only**. The module checks for admin status in multiple ways:

```javascript
// Checked in order:
1. window.isAdmin === true
2. window.auth.isAdmin === true
3. window.currentUser.role === 'admin'
```

### Admin Gating Behavior

- **Non-admins**: 
  - Toggle button is hidden
  - Calling `enableGroupSelection()` shows error toast
  - Cannot enable the mode programmatically
  
- **Admins**: 
  - Toggle button is visible in admin panel
  - Can enable/disable mode freely
  - Automatic check every 2 seconds to update button visibility
  
- **Admin state changes**:
  - If user loses admin access while mode is active, mode is automatically disabled
  - Button visibility updates automatically

### Testing Admin Access

```javascript
// Check if user is admin
const isUserAdmin = window.isAdmin || 
                    (window.auth && window.auth.isAdmin) || 
                    (window.currentUser && window.currentUser.role === 'admin');

console.log('User is admin:', isUserAdmin);
```

## Global State

Access the current state via `window.groupControlState`:

```javascript
{
    active: false,              // Whether selection mode is active
    selected: Set<string>,      // Set of selected target IDs
    dragBox: HTMLElement,       // Drag box element
    lastInteraction: number,    // Timestamp of last interaction
    // ... internal state
}
```

Example:

```javascript
console.log('Selection active:', window.groupControlState.active);
console.log('Selected count:', window.groupControlState.selected.size);
console.log('Selected IDs:', Array.from(window.groupControlState.selected));
```

## Behavior Summary

### Desktop

1. **Click marker**: Toggle selection
2. **Shift + drag**: Draw selection rectangle, select all targets within
3. **Esc key**: Exit selection mode
4. **Ctrl/Cmd + A**: Select all visible targets

### Mobile

1. **Tap marker**: Toggle selection
2. **Tap near marker**: Nearest-marker hit-test (≈24px radius) toggles selection
3. **Long-press + drag**: Draw selection rectangle (~450ms hold)
4. **Vibration feedback** on long-press start (if supported)

### Popup Suppression

When in selection mode:
- Marker popups are completely suppressed
- Clicks on markers only toggle selection
- Any open popups are automatically closed
- Normal popup behavior resumes after exiting selection mode

### Exit Behavior

The action bar includes a large, prominent **"Вийти ×"** button at the bottom:
- Immediately disables selection mode
- Clears all selections
- Hides the action bar
- Restores normal map interaction
- Explicit exit action - no separate close/minimize

### Group Actions

When targets are selected, the action bar appears at the bottom with these actions:

- **Курс (Course)**: Click to activate, then click map to set bearing for all selected
- **Швидкість (Speed)**: Prompt for speed value, apply to all selected
- **Тип (Type)**: Prompt for type, apply to all selected
- **Видалити (Delete)**: Confirm and delete all selected targets
- **Очистити вибір (Clear Selection)**: Deselect all targets
- **❌ Вийти × (Exit)**: Exit selection mode and close menu

## Integration with Existing Hooks

The module attempts to use existing project functions when available, with graceful fallbacks:

### Optional Hooks Used

- `editTargetSpeed(targetId, speed)` - For speed changes
- `editTargetType(targetId, type)` - For type changes
- `changeCourse(targetId, latlng)` - For course changes
- `removeTarget(targetId)` - For deletions
- `deleteTarget(targetId)` - Alternative for deletions
- `updateMarkerIcon(targetId)` - For icon updates
- `updateTargetDirection(targetId, course)` - For rotation updates
- `updateTargetInStorage(target)` - For persistence
- `syncTarget(target)` - For synchronization
- `updateMarkerRotation(target)` - For marker rotation
- `updateStats()` - For stats refresh
- `updateTargetsList()` - For list refresh
- `showToast(message, type)` - For notifications

### Required Globals

The module expects these globals to be available:

- `window.map` - Leaflet map instance
- `window.markers` - Object mapping target IDs to Leaflet markers
- `window.targets` - Array of target objects
- `window.targetTypes` - Object mapping type keys to type definitions (optional)

## Performance Notes

### Optimizations

1. **RequestAnimationFrame throttling**: Pointer/touch move events are throttled using rAF for smooth 60fps rendering
2. **Lazy rendering**: Drag box only appears when size exceeds threshold
3. **Efficient bounds checking**: Spatial calculations performed only at drag end
4. **Set data structure**: O(1) selection lookups using ES6 Set

### Scalability

Tested with 1000+ targets. For extremely large datasets (10,000+), consider:

- Implementing spatial indexing (R-tree) for bounds queries (TODO noted in code)
- Virtualizing marker rendering
- Debouncing selection updates

### Memory Management

- Event listeners properly cleaned up on disable
- No circular references
- Temporary DOM elements removed when not needed

## Customization

### Styling

Override CSS variables in your stylesheet:

```css
:root {
    --accent: #00bcd4;          /* Primary accent color */
    --error: #ff7675;           /* Error/danger color */
    --text: #e0e0e0;            /* Primary text color */
    --text-dim: #b0b0b0;        /* Secondary text color */
}
```

Customize specific classes:

```css
/* Modify selection highlight */
.target-selected {
    filter: drop-shadow(0 0 20px #ff0000) !important;
}

/* Modify drag box */
.drag-selection-box {
    border-color: #ff0000;
    background: rgba(255, 0, 0, 0.1);
}

/* Modify action bar */
.group-control-bar {
    background: rgba(10, 10, 10, 0.95);
}
```

### Configuration

Edit constants in `groupControl.js`:

```javascript
const CONFIG = {
    LONG_PRESS_DURATION: 450,   // ms for mobile long-press (~0.45s)
    DRAG_THRESHOLD: 5,          // pixels before drag starts
    THROTTLE_INTERVAL: 16,      // ms (~60fps) for move events
    MIN_DRAG_SIZE: 10           // minimum drag box size
};
```

## Troubleshooting

### Selection mode doesn't activate

**Check**: Ensure `window.map` is defined and is a valid Leaflet map instance.

```javascript
console.log('Map instance:', window.map);
```

### Markers don't highlight when selected

**Check**: Ensure markers have the `getElement()` method (Leaflet markers should).

```javascript
Object.values(window.markers).forEach(m => {
    console.log('Has getElement:', typeof m.getElement === 'function');
});
```

### Group actions don't work

**Check**: Ensure `window.targets` array exists and contains target objects with `id` property.

```javascript
console.log('Targets:', window.targets);
console.log('Target IDs:', window.targets.map(t => t.id));
```

### Drag selection doesn't work on mobile

**Check**: Ensure touch events are not blocked by other listeners. The module uses `preventDefault()` during drag.

**Check**: Test long-press duration - default is 600ms. Adjust `CONFIG.LONG_PRESS_DURATION` if needed.

### Console errors about missing hooks

**This is normal**. The module uses defensive checks and gracefully falls back when optional hooks are missing. Warnings are logged but don't affect functionality.

### Performance issues with many targets

**Solutions**:
- Reduce `THROTTLE_INTERVAL` (increase delay between updates)
- Implement clustering for markers (already supported if using `window.markerCluster`)
- Consider virtualizing off-screen markers

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (desktop and iOS)
- **Mobile browsers**: Tested on iOS Safari, Chrome Android

**Minimum requirements**: ES6 support (Set, arrow functions, template literals, requestAnimationFrame)

## Accessibility

### ARIA Support

- Action bar has `role="toolbar"`
- Buttons have `aria-label` attributes
- Selection count has `aria-live="polite"` for screen reader updates

### Keyboard Navigation

- All buttons are keyboard accessible
- Focus indicators visible with `:focus-visible`
- Esc key exits mode
- Ctrl/Cmd+A selects all

### Reduced Motion

Users with `prefers-reduced-motion` setting enabled will see minimal animations.

## Examples

### Example 1: Enable on Button Click

```javascript
document.getElementById('myButton').addEventListener('click', () => {
    window.groupControl.toggleGroupSelection();
});
```

### Example 2: Select Specific Targets

```javascript
// Select targets by type
window.targets
    .filter(t => t.type === 'шахед-136')
    .forEach(t => window.groupControl.selectTarget(t.id));
```

### Example 3: Programmatic Group Action

```javascript
// Select all fast targets and change type
window.targets
    .filter(t => t.speed > 500)
    .forEach(t => window.groupControl.selectTarget(t.id));

// Then apply type change
window.groupControl.applyGroupAction('type');
```

### Example 4: Auto-enable on Page Load

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Wait for map initialization
    setTimeout(() => {
        window.groupControl.enableGroupSelection();
    }, 1000);
});
```

## License

MIT License - Free to use and modify

## Support

For issues or questions, please refer to the project repository or contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Author**: Ukraine Radar Team
