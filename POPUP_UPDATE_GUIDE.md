# Target Popup UI Update - Implementation Guide

## Overview
This update completely redesigns the target popup with a futuristic, military-inspired interface and adds a new predicted trajectory visualization feature.

## New Features

### 1. Futuristic Popup Design
The target popup has been completely redesigned with:
- **Semi-transparent panel** with backdrop blur effect
- **Grid layout** for organized data display
- **Animated appearance** with smooth fade-in
- **Icon indicators** for each data field
- **Real-time updates** of target information

### 2. Enhanced Data Display
Target information is now displayed in a modern grid with the following parameters:
- 📍 **Координати** (Coordinates): Latitude and longitude with 6 decimal precision
- 🧭 **Курс** (Course): Current heading in degrees
- 🏃 **Швидкість** (Speed): Current speed in km/h
- 📏 **Пройдено** (Distance): Total distance traveled in km
- 📅 **Додано** (Added): Timestamp when target was created
- 🕐 **Оновлено** (Updated): Last update timestamp

### 3. Predicted Trajectory Feature
New function `showPredictedTrajectory(targetId, distanceKm = 150)` that:
- Draws a **dashed aqua line** showing predicted path 150km ahead
- Line specs: `color: #00ffff, dashArray: '5, 10', opacity: 0.7`
- **Smooth fade-in animation** from opacity 0 to 0.7
- Automatically shows **past trajectory** (if available) for 10 seconds
- Both lines **automatically disappear** after 10 seconds with fade-out animation
- Updates existing prediction if called again for same target

### 4. Button Redesign
All action buttons now feature:
- **Neon glow effects** with color-coding by function
- **Rounded corners** (8px border-radius)
- **Pulse animations** on hover
- **Touch flash effect** on mobile tap
- **Icon + text** layout for clarity

Button variants:
- **Edit** (Green): `rgba(46, 204, 113, 0.2)` - Edit target properties
- **Course** (Purple): `rgba(155, 89, 182, 0.2)` - Change course
- **Trajectory** (Orange): `rgba(243, 156, 18, 0.2)` - Draw custom path
- **🔮 Predict** (Aqua): `rgba(0, 255, 255, 0.2)` - Show predicted trajectory (with pulse glow)
- **Delete** (Red): `rgba(255, 118, 117, 0.2)` - Remove target

### 5. Mobile Responsive Design
On screens ≤768px:
- Popup positioned as **bottom drawer**
- **Larger touch targets** (min 48px height)
- **Swipe down gesture** to close popup
- Buttons stacked vertically for easy thumb access
- Full-width layout with padding

### 6. Touch Interactions
Mobile-specific touch events:
- **Swipe down** on popup to close (drag > 50px)
- **Visual feedback** during swipe (translucent overlay)
- **Button flash** on touch start
- **Smooth animations** on touch interactions

## CSS Variables Used
```css
--accent: #00bcd4       /* Primary cyan */
--accent2: #2ecc71      /* Success green */
--error: #ff7675        /* Error red */
--text: #e0e0e0         /* Main text */
--text-dim: #b0b0b0     /* Secondary text */
--panel: rgba(20, 25, 35, 0.85)  /* Panel background */
--radius-sm: 8px        /* Small border radius */
--transition: all 0.3s ease  /* Standard transition */
--glow: 0 0 20px        /* Glow effect */
```

## Animations

### 1. Icon Pulse
```css
@keyframes iconPulse {
    0%, 100% { filter: drop-shadow(0 0 6px var(--accent)); transform: scale(1); }
    50% { filter: drop-shadow(0 0 12px var(--accent)); transform: scale(1.1); }
}
```

### 2. Button Pulse
```css
@keyframes buttonPulse {
    0%, 100% { box-shadow: 0 0 15px rgba(0, 188, 212, 0.3); }
    50% { box-shadow: 0 0 25px rgba(0, 188, 212, 0.6); }
}
```

### 3. Predict Button Glow
```css
@keyframes predictButtonGlow {
    0%, 100% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.3); }
    50% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.6); }
}
```

### 4. Touch Flash
```css
@keyframes touchFlash {
    0%, 100% { background: linear-gradient(135deg, rgba(0, 188, 212, 0.2), rgba(0, 188, 212, 0.1)); }
    50% { background: linear-gradient(135deg, rgba(0, 188, 212, 0.5), rgba(0, 188, 212, 0.3)); }
}
```

### 5. Trajectory Dash Animation
```css
@keyframes dashAnimation {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: 30; }
}
```

## Usage Examples

### Show Predicted Trajectory
```javascript
// Show 150km predicted path (default)
showPredictedTrajectory('target-id-123');

// Show 200km predicted path
showPredictedTrajectory('target-id-123', 200);
```

### Popup Button Click
```html
<button class="action-button predict-btn" 
        onclick="event.stopPropagation(); showPredictedTrajectory('${target.id}', 150)">
    <i class="fas fa-crystal-ball"></i> 🔮 Прогноз траєкторії
</button>
```

## Technical Implementation

### Global Variables
```javascript
let predictedPolylines = {};  // Stores predicted trajectory polylines
let trajectoryTimeouts = {};  // Stores timeout IDs for auto-removal
```

### Key Functions

#### showPredictedTrajectory(targetId, distanceKm)
1. Finds target by ID
2. Clears any existing predicted trajectory
3. Calculates points along the predicted path (every 10km)
4. Creates dashed aqua polyline
5. Animates opacity from 0 to 0.7
6. Activates past trajectory display
7. Sets 10-second timeout for auto-removal with fade-out

#### setupPopupTouchEvents(marker)
1. Gets popup container element
2. Adds touchstart/touchmove/touchend listeners
3. Tracks swipe distance and direction
4. Applies visual feedback during swipe
5. Closes popup if swiped down > 50px
6. Adds touch flash effect to buttons

### Popup HTML Structure
```html
<div class="target-info-window futuristic-popup">
    <h4><i class="fas fa-crosshairs"></i> Target Name</h4>
    
    <div class="target-data-grid">
        <div class="data-item">
            <span class="data-label"><i class="fas fa-map-marker-alt"></i> Координати:</span>
            <span class="data-value">50.450001, 30.523333</span>
        </div>
        <!-- More data items... -->
    </div>
    
    <div class="action-buttons">
        <!-- Grid of action buttons -->
    </div>
</div>
```

## Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Requires support for:
- CSS Grid
- CSS Variables
- Backdrop Filter
- Touch Events API
- ES6+ JavaScript

## Testing Checklist

### Desktop
- [ ] Popup appears with smooth animation
- [ ] All data fields display correctly
- [ ] Button hover effects work (glow, pulse)
- [ ] Predict button shows continuous pulse
- [ ] Predicted trajectory draws correctly
- [ ] Past trajectory activates for 10 seconds
- [ ] Lines disappear after 10 seconds
- [ ] Multiple predictions update correctly

### Mobile
- [ ] Popup appears as bottom drawer
- [ ] Buttons are touch-friendly (≥48px)
- [ ] Swipe down closes popup
- [ ] Visual feedback during swipe
- [ ] Touch flash on button tap
- [ ] All buttons stacked vertically
- [ ] Text remains readable

## Notes
- Popup data updates in real-time from target object
- Predicted trajectory uses `calculateDestination()` function
- Touch events use passive listeners for performance
- All animations respect `prefers-reduced-motion`
- Styles use CSS variables for easy theming

## Migration from Old Popup
The new popup is **backward compatible** with existing code:
- Same function names (`addTargetToMap`)
- Same target object structure
- All existing buttons still work
- Only visual presentation changed
- New predict button is additive

No breaking changes to existing functionality!
