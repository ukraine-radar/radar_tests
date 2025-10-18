/**
 * Group Control System - Modular ES6 Module
 * Professional multi-target selection and management for Leaflet + JS UI
 * 
 * @version 1.0.0
 * @author Ukraine Radar Team
 * @license MIT
 */

(function() {
    'use strict';

    /* ========== Global State ========== */
    
    /**
     * Global state accessible via window.groupControlState
     */
    const state = {
        active: false,                    // Whether group selection mode is active
        selected: new Set(),              // Set of selected target IDs
        dragBox: null,                    // Drag selection box element
        lastInteraction: 0,               // Timestamp of last interaction
        dragStartPoint: null,             // Starting point for drag selection
        isDragging: false,                // Whether user is currently dragging
        longPressTimer: null,             // Timer for mobile long-press detection
        longPressIndicator: null,         // Visual indicator for long-press
        courseSelectionActive: false,     // Whether awaiting course click
        rafId: null                       // RequestAnimationFrame ID for throttling
    };

    // Expose state globally
    window.groupControlState = state;

    /* ========== Configuration ========== */
    
    const CONFIG = {
        LONG_PRESS_DURATION: 600,         // ms for mobile long-press
        DRAG_THRESHOLD: 5,                // pixels before drag starts
        THROTTLE_INTERVAL: 16,            // ms (~60fps) for move events
        MIN_DRAG_SIZE: 10                 // minimum drag box size in pixels
    };

    /* ========== DOM Elements ========== */
    
    let actionBar = null;
    let selectionCountEl = null;
    let toggleButton = null;

    /* ========== Utility Functions ========== */

    /**
     * Check if current user is admin
     * @returns {boolean} True if user has admin privileges
     */
    function isAdmin() {
        // Check multiple possible admin flags
        if (window.isAdmin === true) return true;
        if (window.auth && window.auth.isAdmin === true) return true;
        if (window.currentUser && window.currentUser.role === 'admin') return true;
        return false;
    }

    /**
     * Get all markers on the map
     * @returns {Array} Array of {id, marker, latlng} objects
     */
    function getAllMarkers() {
        const markers = [];
        
        // Access global markers object if available
        if (window.markers && typeof window.markers === 'object') {
            Object.keys(window.markers).forEach(id => {
                const marker = window.markers[id];
                if (marker && marker.getLatLng) {
                    markers.push({
                        id: id,
                        marker: marker,
                        latlng: marker.getLatLng()
                    });
                }
            });
        }
        
        return markers;
    }

    /**
     * Get target data by ID
     * @param {string} targetId - Target ID
     * @returns {Object|null} Target object or null
     */
    function getTargetById(targetId) {
        if (window.targets && Array.isArray(window.targets)) {
            return window.targets.find(t => t.id === targetId) || null;
        }
        return null;
    }

    /**
     * Get map instance
     * @returns {Object|null} Leaflet map instance or null
     */
    function getMap() {
        return window.map || null;
    }

    /**
     * Check if a marker is within a rectangular bounds
     * @param {Object} marker - Marker with latlng
     * @param {Object} bounds - {minX, minY, maxX, maxY} in pixel coords
     * @returns {boolean}
     */
    function isMarkerInBounds(marker, bounds) {
        const map = getMap();
        if (!map || !marker.marker) return false;
        
        const point = map.latLngToContainerPoint(marker.latlng);
        
        return point.x >= bounds.minX && 
               point.x <= bounds.maxX && 
               point.y >= bounds.minY && 
               point.y <= bounds.maxY;
    }

    /**
     * Safely call optional project hooks
     * @param {string} hookName - Name of the hook function
     * @param {...any} args - Arguments to pass
     * @returns {any} Result of hook or undefined
     */
    function callHook(hookName, ...args) {
        if (typeof window[hookName] === 'function') {
            try {
                return window[hookName](...args);
            } catch (error) {
                console.warn(`Error calling hook ${hookName}:`, error);
            }
        }
        return undefined;
    }

    /* ========== Selection Management ========== */

    /**
     * Select a target
     * @param {string} targetId - Target ID to select
     */
    function selectTarget(targetId) {
        if (!state.active) return;
        
        state.selected.add(targetId);
        updateMarkerHighlight(targetId, true);
        updateSelectionCount();
        state.lastInteraction = Date.now();
    }

    /**
     * Deselect a target
     * @param {string} targetId - Target ID to deselect
     */
    function deselectTarget(targetId) {
        state.selected.delete(targetId);
        updateMarkerHighlight(targetId, false);
        updateSelectionCount();
        state.lastInteraction = Date.now();
    }

    /**
     * Clear all selected targets
     */
    function clearGroupSelection() {
        const selectedIds = Array.from(state.selected);
        selectedIds.forEach(id => {
            updateMarkerHighlight(id, false);
        });
        state.selected.clear();
        updateSelectionCount();
        state.lastInteraction = Date.now();
    }

    /**
     * Toggle target selection
     * @param {string} targetId - Target ID to toggle
     */
    function toggleTargetSelection(targetId) {
        if (state.selected.has(targetId)) {
            deselectTarget(targetId);
        } else {
            selectTarget(targetId);
        }
    }

    /**
     * Select all visible targets
     */
    function selectAllTargets() {
        if (!state.active) return;
        
        const markers = getAllMarkers();
        markers.forEach(m => {
            selectTarget(m.id);
        });
    }

    /**
     * Update marker visual highlight
     * @param {string} targetId - Target ID
     * @param {boolean} selected - Whether selected
     */
    function updateMarkerHighlight(targetId, selected) {
        if (!window.markers || !window.markers[targetId]) return;
        
        const marker = window.markers[targetId];
        const element = marker.getElement();
        
        if (element) {
            if (selected) {
                element.classList.add('target-selected');
            } else {
                element.classList.remove('target-selected');
            }
        }
        
        // Try to update icon if updateMarkerIcon hook is available
        callHook('updateMarkerIcon', targetId);
    }

    /**
     * Update selection count display
     */
    function updateSelectionCount() {
        if (selectionCountEl) {
            selectionCountEl.textContent = `Вибрано: ${state.selected.size}`;
        }
    }

    /* ========== UI Management ========== */

    /**
     * Create and show the action bar
     */
    function createActionBar() {
        if (actionBar) return; // Already created
        
        actionBar = document.createElement('div');
        actionBar.className = 'group-control-bar';
        actionBar.setAttribute('role', 'toolbar');
        actionBar.setAttribute('aria-label', 'Групові дії з цілями');
        
        actionBar.innerHTML = `
            <div class="group-control-header">
                <div class="group-control-title">
                    <i class="fas fa-layer-group"></i>
                    <span>Режим вибору цілей</span>
                </div>
                <div class="group-selection-count" role="status" aria-live="polite">
                    Вибрано: 0
                </div>
            </div>
            <div class="group-actions-buttons">
                <button class="group-action-btn" data-action="course" aria-label="Встановити курс для вибраних цілей">
                    <i class="fas fa-compass"></i>
                    <span>Курс</span>
                </button>
                <button class="group-action-btn" data-action="speed" aria-label="Встановити швидкість для вибраних цілей">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>Швидкість</span>
                </button>
                <button class="group-action-btn" data-action="type" aria-label="Змінити тип вибраних цілей">
                    <i class="fas fa-tag"></i>
                    <span>Тип</span>
                </button>
                <button class="group-action-btn danger" data-action="delete" aria-label="Видалити вибрані цілі">
                    <i class="fas fa-trash"></i>
                    <span>Видалити</span>
                </button>
                <button class="group-action-btn secondary" data-action="clear" aria-label="Очистити вибір">
                    <i class="fas fa-eraser"></i>
                    <span>Очистити вибір</span>
                </button>
                <button class="group-action-btn secondary" data-action="exit" aria-label="Вийти з режиму вибору">
                    <i class="fas fa-times"></i>
                    <span>Вийти ×</span>
                </button>
            </div>
        `;
        
        document.body.appendChild(actionBar);
        
        // Get reference to count element
        selectionCountEl = actionBar.querySelector('.group-selection-count');
        
        // Attach event listeners
        actionBar.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', handleActionClick);
        });
    }

    /**
     * Show the action bar
     */
    function showActionBar() {
        if (actionBar) {
            actionBar.classList.add('active');
        }
    }

    /**
     * Hide the action bar
     */
    function hideActionBar() {
        if (actionBar) {
            actionBar.classList.remove('active');
        }
    }

    /**
     * Handle action button clicks
     * @param {Event} e - Click event
     */
    function handleActionClick(e) {
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
            case 'course':
                applyGroupAction('course');
                break;
            case 'speed':
                applyGroupAction('speed');
                break;
            case 'type':
                applyGroupAction('type');
                break;
            case 'delete':
                applyGroupAction('delete');
                break;
            case 'clear':
                clearGroupSelection();
                break;
            case 'exit':
                disableGroupSelection();
                break;
        }
    }

    /* ========== Group Actions ========== */

    /**
     * Apply an action to all selected targets
     * @param {string} actionType - Type of action: course, speed, type, delete
     */
    function applyGroupAction(actionType) {
        if (state.selected.size === 0) {
            alert('Немає вибраних цілей');
            return;
        }
        
        const selectedIds = Array.from(state.selected);
        
        switch (actionType) {
            case 'course':
                handleCourseAction(selectedIds);
                break;
            case 'speed':
                handleSpeedAction(selectedIds);
                break;
            case 'type':
                handleTypeAction(selectedIds);
                break;
            case 'delete':
                handleDeleteAction(selectedIds);
                break;
        }
    }

    /**
     * Handle course action - wait for map click
     * @param {Array} selectedIds - Selected target IDs
     */
    function handleCourseAction(selectedIds) {
        const map = getMap();
        if (!map) return;
        
        // Show notification
        showNotification('Клікніть по карті для встановлення курсу', 'info');
        
        state.courseSelectionActive = true;
        
        // One-time click listener
        const clickHandler = (e) => {
            if (!state.courseSelectionActive) return;
            
            const targetLatLng = e.latlng;
            
            selectedIds.forEach(targetId => {
                const target = getTargetById(targetId);
                if (!target) return;
                
                // Try using changeCourse hook if available
                const hookResult = callHook('changeCourse', targetId, targetLatLng);
                
                // Fallback: compute bearing and update
                if (hookResult === undefined) {
                    const course = calculateBearing(
                        { lat: target.latitude, lng: target.longitude },
                        targetLatLng
                    );
                    
                    target.course = course;
                    target.updatedAt = Date.now();
                    
                    // Try updateTargetDirection hook
                    callHook('updateTargetDirection', targetId, course);
                    
                    // Try storage hooks
                    callHook('updateTargetInStorage', target);
                    callHook('syncTarget', target);
                    
                    // Update marker rotation
                    callHook('updateMarkerRotation', target);
                }
            });
            
            state.courseSelectionActive = false;
            map.off('click', clickHandler);
            
            showNotification(`Курс встановлено для ${selectedIds.length} цілей`, 'success');
        };
        
        map.once('click', clickHandler);
    }

    /**
     * Handle speed action - prompt for speed
     * @param {Array} selectedIds - Selected target IDs
     */
    function handleSpeedAction(selectedIds) {
        const speedStr = prompt('Введіть швидкість (км/год):', '500');
        if (speedStr === null) return; // Cancelled
        
        const speed = parseInt(speedStr, 10);
        if (isNaN(speed) || speed < 0 || speed > 30000) {
            alert('Невірне значення швидкості (0-30000 км/год)');
            return;
        }
        
        selectedIds.forEach(targetId => {
            const target = getTargetById(targetId);
            if (!target) return;
            
            // Try editTargetSpeed hook
            const hookResult = callHook('editTargetSpeed', targetId, speed);
            
            // Fallback: mutate target directly
            if (hookResult === undefined) {
                target.speed = speed;
                target.updatedAt = Date.now();
                
                // Try storage hooks
                callHook('updateTargetInStorage', target);
                callHook('syncTarget', target);
            }
        });
        
        showNotification(`Швидкість встановлено для ${selectedIds.length} цілей`, 'success');
        
        // Update UI
        callHook('updateStats');
        callHook('updateTargetsList');
    }

    /**
     * Handle type action - prompt for type
     * @param {Array} selectedIds - Selected target IDs
     */
    function handleTypeAction(selectedIds) {
        // Try to get available types
        const typesList = window.targetTypes || {};
        const typesKeys = Object.keys(typesList);
        
        let typePrompt = 'Введіть тип цілі';
        if (typesKeys.length > 0) {
            typePrompt += '\nДоступні: ' + typesKeys.slice(0, 5).join(', ') + '...';
        }
        
        const type = prompt(typePrompt, 'шахед-136');
        if (!type) return; // Cancelled or empty
        
        selectedIds.forEach(targetId => {
            const target = getTargetById(targetId);
            if (!target) return;
            
            // Try editTargetType hook
            const hookResult = callHook('editTargetType', targetId, type);
            
            // Fallback: mutate target directly
            if (hookResult === undefined) {
                target.type = type;
                target.updatedAt = Date.now();
                
                // Try storage hooks
                callHook('updateTargetInStorage', target);
                callHook('syncTarget', target);
                
                // Update marker icon
                callHook('updateMarkerIcon', targetId);
            }
        });
        
        showNotification(`Тип встановлено для ${selectedIds.length} цілей`, 'success');
        
        // Update UI
        callHook('updateStats');
        callHook('updateTargetsList');
    }

    /**
     * Handle delete action - confirm and delete
     * @param {Array} selectedIds - Selected target IDs
     */
    function handleDeleteAction(selectedIds) {
        const count = selectedIds.length;
        
        if (!confirm(`Ви впевнені, що хочете видалити ${count} ${count === 1 ? 'ціль' : 'цілей'}?`)) {
            return;
        }
        
        selectedIds.forEach(targetId => {
            // Try removeTarget or deleteTarget hooks
            const hookResult = callHook('removeTarget', targetId) || callHook('deleteTarget', targetId);
            
            // Fallback: remove marker manually
            if (hookResult === undefined && window.markers && window.markers[targetId]) {
                const marker = window.markers[targetId];
                const map = getMap();
                if (map) {
                    map.removeLayer(marker);
                }
                delete window.markers[targetId];
            }
        });
        
        showNotification(`Видалено ${count} ${count === 1 ? 'ціль' : 'цілей'}`, 'success');
        
        // Clear selection
        clearGroupSelection();
        
        // Update UI
        callHook('updateStats');
        callHook('updateTargetsList');
    }

    /**
     * Calculate bearing between two points
     * @param {Object} from - {lat, lng}
     * @param {Object} to - {lat, lng}
     * @returns {number} Bearing in degrees
     */
    function calculateBearing(from, to) {
        const dLon = (to.lng - from.lng) * Math.PI / 180;
        const lat1 = from.lat * Math.PI / 180;
        const lat2 = to.lat * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                 Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;
        
        return Math.round(bearing);
    }

    /**
     * Show a notification
     * @param {string} message - Message to show
     * @param {string} type - Type: info, success, error
     */
    function showNotification(message, type = 'info') {
        // Try to use existing toast system if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Fallback: simple alert-style notification
        const notification = document.createElement('div');
        notification.className = `course-notification ${type}`;
        notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 25, 35, 0.95);
            backdrop-filter: blur(20px);
            border: 2px solid var(--accent, #00bcd4);
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            color: var(--text, #e0e0e0);
            font-weight: 600;
            animation: slideDownToast 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -20px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /* ========== Drag Selection ========== */

    /**
     * Create drag selection box element
     */
    function createDragBox() {
        if (state.dragBox) return;
        
        state.dragBox = document.createElement('div');
        state.dragBox.className = 'drag-selection-box';
        state.dragBox.style.display = 'none';
        document.body.appendChild(state.dragBox);
    }

    /**
     * Update drag box position and size
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} currentX - Current X coordinate
     * @param {number} currentY - Current Y coordinate
     */
    function updateDragBox(startX, startY, currentX, currentY) {
        if (!state.dragBox) return;
        
        const minX = Math.min(startX, currentX);
        const minY = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        state.dragBox.style.left = minX + 'px';
        state.dragBox.style.top = minY + 'px';
        state.dragBox.style.width = width + 'px';
        state.dragBox.style.height = height + 'px';
        state.dragBox.style.display = (width > CONFIG.MIN_DRAG_SIZE || height > CONFIG.MIN_DRAG_SIZE) ? 'block' : 'none';
    }

    /**
     * Hide and reset drag box
     */
    function hideDragBox() {
        if (state.dragBox) {
            state.dragBox.style.display = 'none';
        }
    }

    /**
     * Select targets within drag box bounds
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     */
    function selectTargetsInBox(startX, startY, endX, endY) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        
        const bounds = { minX, minY, maxX, maxY };
        const markers = getAllMarkers();
        
        markers.forEach(m => {
            if (isMarkerInBounds(m, bounds)) {
                selectTarget(m.id);
            }
        });
    }

    /* ========== Event Handlers ========== */

    /**
     * Handle mousedown on map (desktop drag start)
     * @param {Event} e - Mouse event
     */
    function handleMouseDown(e) {
        if (!state.active) return;
        
        // Check if Shift key is pressed for drag selection
        if (e.originalEvent && e.originalEvent.shiftKey) {
            e.originalEvent.preventDefault();
            
            state.isDragging = true;
            state.dragStartPoint = {
                x: e.originalEvent.clientX,
                y: e.originalEvent.clientY
            };
            
            createDragBox();
            
            // Add no-select class to prevent text selection
            document.body.classList.add('no-select');
        }
    }

    /**
     * Handle mousemove on map (desktop drag update)
     * @param {Event} e - Mouse event
     */
    function handleMouseMove(e) {
        if (!state.active || !state.isDragging || !state.dragStartPoint) return;
        
        // Throttle with requestAnimationFrame
        if (state.rafId) return;
        
        state.rafId = requestAnimationFrame(() => {
            if (e.originalEvent) {
                updateDragBox(
                    state.dragStartPoint.x,
                    state.dragStartPoint.y,
                    e.originalEvent.clientX,
                    e.originalEvent.clientY
                );
            }
            state.rafId = null;
        });
    }

    /**
     * Handle mouseup on map (desktop drag end)
     * @param {Event} e - Mouse event
     */
    function handleMouseUp(e) {
        if (!state.active) return;
        
        if (state.isDragging && state.dragStartPoint && e.originalEvent) {
            const dx = Math.abs(e.originalEvent.clientX - state.dragStartPoint.x);
            const dy = Math.abs(e.originalEvent.clientY - state.dragStartPoint.y);
            
            // Only select if drag was significant
            if (dx > CONFIG.MIN_DRAG_SIZE || dy > CONFIG.MIN_DRAG_SIZE) {
                selectTargetsInBox(
                    state.dragStartPoint.x,
                    state.dragStartPoint.y,
                    e.originalEvent.clientX,
                    e.originalEvent.clientY
                );
            }
            
            hideDragBox();
            state.isDragging = false;
            state.dragStartPoint = null;
            
            document.body.classList.remove('no-select');
        }
    }

    /**
     * Handle marker click (toggle selection)
     * @param {Event} e - Click event
     * @param {string} targetId - Target ID
     */
    function handleMarkerClick(e, targetId) {
        if (!state.active) return;
        
        // Prevent popup from opening in selection mode
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
        }
        L.DomEvent.stopPropagation(e);
        
        toggleTargetSelection(targetId);
    }

    /**
     * Handle touchstart on map (mobile long-press start)
     * @param {Event} e - Touch event
     */
    function handleTouchStart(e) {
        if (!state.active) return;
        
        const touch = e.originalEvent.touches[0];
        if (!touch) return;
        
        const touchPoint = {
            x: touch.clientX,
            y: touch.clientY
        };
        
        // Start long-press timer
        state.longPressTimer = setTimeout(() => {
            // Long press detected - start drag
            state.isDragging = true;
            state.dragStartPoint = touchPoint;
            
            createDragBox();
            showLongPressIndicator(touchPoint.x, touchPoint.y);
            
            // Vibrate if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, CONFIG.LONG_PRESS_DURATION);
    }

    /**
     * Handle touchmove on map (mobile drag update)
     * @param {Event} e - Touch event
     */
    function handleTouchMove(e) {
        if (!state.active) return;
        
        // Cancel long-press timer if moved before timeout
        if (state.longPressTimer && !state.isDragging) {
            clearTimeout(state.longPressTimer);
            state.longPressTimer = null;
            return;
        }
        
        if (state.isDragging && state.dragStartPoint) {
            const touch = e.originalEvent.touches[0];
            if (!touch) return;
            
            e.originalEvent.preventDefault(); // Prevent scrolling
            
            // Throttle with requestAnimationFrame
            if (state.rafId) return;
            
            state.rafId = requestAnimationFrame(() => {
                updateDragBox(
                    state.dragStartPoint.x,
                    state.dragStartPoint.y,
                    touch.clientX,
                    touch.clientY
                );
                state.rafId = null;
            });
        }
    }

    /**
     * Handle touchend on map (mobile drag end)
     * @param {Event} e - Touch event
     */
    function handleTouchEnd(e) {
        if (!state.active) return;
        
        // Clear long-press timer
        if (state.longPressTimer) {
            clearTimeout(state.longPressTimer);
            state.longPressTimer = null;
        }
        
        hideLongPressIndicator();
        
        if (state.isDragging && state.dragStartPoint) {
            const touch = e.originalEvent.changedTouches[0];
            if (touch) {
                const dx = Math.abs(touch.clientX - state.dragStartPoint.x);
                const dy = Math.abs(touch.clientY - state.dragStartPoint.y);
                
                if (dx > CONFIG.MIN_DRAG_SIZE || dy > CONFIG.MIN_DRAG_SIZE) {
                    selectTargetsInBox(
                        state.dragStartPoint.x,
                        state.dragStartPoint.y,
                        touch.clientX,
                        touch.clientY
                    );
                }
            }
            
            hideDragBox();
            state.isDragging = false;
            state.dragStartPoint = null;
        }
    }

    /**
     * Show long-press indicator
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    function showLongPressIndicator(x, y) {
        if (state.longPressIndicator) {
            state.longPressIndicator.remove();
        }
        
        state.longPressIndicator = document.createElement('div');
        state.longPressIndicator.className = 'long-press-indicator';
        state.longPressIndicator.style.left = (x - 30) + 'px';
        state.longPressIndicator.style.top = (y - 30) + 'px';
        
        document.body.appendChild(state.longPressIndicator);
    }

    /**
     * Hide long-press indicator
     */
    function hideLongPressIndicator() {
        if (state.longPressIndicator) {
            state.longPressIndicator.remove();
            state.longPressIndicator = null;
        }
    }

    /**
     * Handle keyboard events
     * @param {Event} e - Keyboard event
     */
    function handleKeyboard(e) {
        if (!state.active) return;
        
        // Escape - disable selection
        if (e.key === 'Escape') {
            disableGroupSelection();
        }
        
        // Ctrl+A or Cmd+A - select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            selectAllTargets();
        }
    }

    /* ========== Public API ========== */

    /**
     * Enable group selection mode
     */
    function enableGroupSelection() {
        // Admin-only check
        if (!isAdmin()) {
            showNotification('Лише адміністратори можуть використовувати режим вибору цілей', 'error');
            console.warn('Group selection denied: user is not admin');
            return;
        }
        
        if (state.active) return;
        
        state.active = true;
        state.lastInteraction = Date.now();
        
        const map = getMap();
        if (!map) {
            console.warn('Map instance not found');
            return;
        }
        
        // Create UI elements
        createActionBar();
        createDragBox();
        showActionBar();
        
        // Attach event listeners
        map.on('mousedown', handleMouseDown);
        map.on('mousemove', handleMouseMove);
        map.on('mouseup', handleMouseUp);
        map.on('touchstart', handleTouchStart);
        map.on('touchmove', handleTouchMove);
        map.on('touchend', handleTouchEnd);
        
        // Keyboard listener
        document.addEventListener('keydown', handleKeyboard);
        
        // Attach click listeners to all existing markers
        const markers = getAllMarkers();
        markers.forEach(m => {
            if (m.marker) {
                m.marker.on('click', (e) => handleMarkerClick(e, m.id));
                
                // Add hover class
                const element = m.marker.getElement();
                if (element) {
                    element.classList.add('group-hover');
                }
            }
        });
        
        // Update toggle button if present
        updateToggleButton(true);
        
        console.log('Group selection enabled');
    }

    /**
     * Disable group selection mode
     */
    function disableGroupSelection() {
        if (!state.active) return;
        
        state.active = false;
        
        const map = getMap();
        if (map) {
            // Remove event listeners
            map.off('mousedown', handleMouseDown);
            map.off('mousemove', handleMouseMove);
            map.off('mouseup', handleMouseUp);
            map.off('touchstart', handleTouchStart);
            map.off('touchmove', handleTouchMove);
            map.off('touchend', handleTouchEnd);
        }
        
        // Remove keyboard listener
        document.removeEventListener('keydown', handleKeyboard);
        
        // Remove click listeners and hover class from markers
        const markers = getAllMarkers();
        markers.forEach(m => {
            if (m.marker) {
                m.marker.off('click');
                
                const element = m.marker.getElement();
                if (element) {
                    element.classList.remove('group-hover');
                }
            }
        });
        
        // Clear selection and hide UI
        clearGroupSelection();
        hideActionBar();
        hideDragBox();
        
        // Cancel any ongoing course selection
        state.courseSelectionActive = false;
        
        // Update toggle button if present
        updateToggleButton(false);
        
        console.log('Group selection disabled');
    }

    /**
     * Toggle group selection mode
     */
    function toggleGroupSelection() {
        if (state.active) {
            disableGroupSelection();
        } else {
            enableGroupSelection();
        }
    }

    /**
     * Update toggle button appearance
     * @param {boolean} active - Whether active
     */
    function updateToggleButton(active) {
        // Update both possible toggle buttons
        const buttons = [
            document.getElementById('toggleSelectionBtn'),
            document.getElementById('groupSelectionProBtn')
        ].filter(Boolean);
        
        buttons.forEach(btn => {
            if (active) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        if (!toggleButton && buttons.length > 0) {
            toggleButton = buttons[0];
        }
    }

    /* ========== Initialization ========== */

    /**
     * Initialize the group control system
     */
    function init() {
        console.log('Initializing Group Control System...');
        
        // Wire up toggle button if present (legacy)
        toggleButton = document.getElementById('toggleSelectionBtn');
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleGroupSelection);
            console.log('Toggle button (legacy) wired');
        }
        
        // Wire up new group selection button if present
        const groupSelectionBtn = document.getElementById('groupSelectionProBtn');
        if (groupSelectionBtn) {
            // Button already has onclick handler in HTML, but we'll also track it
            if (!toggleButton) {
                toggleButton = groupSelectionBtn;
            }
            console.log('Group selection button found');
        }
    }

    /* ========== Export Public API ========== */

    window.groupControl = {
        enableGroupSelection,
        disableGroupSelection,
        toggleGroupSelection,
        selectTarget,
        deselectTarget,
        clearGroupSelection,
        applyGroupAction,
        init
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
