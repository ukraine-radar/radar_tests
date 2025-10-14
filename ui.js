/* ===================================================================
   UI.JS - MODERN UI/UX INTERACTIONS AND ANIMATIONS
   Handles microinteractions, notifications, and visual feedback
   =================================================================== */

// UI UPDATE: Toast Notification System
const UINotifications = {
    container: null,
    
    init() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    },
    
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="toast-message">${message}</div>
        `;
        
        this.container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.4s ease reverse';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 400);
        }, duration);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.style.animation = 'toastSlideIn 0.4s ease reverse';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 400);
        });
        
        return toast;
    },
    
    getIcon(type) {
        const icons = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle'
        };
        return icons[type] || icons.info;
    },
    
    success(message, duration) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        return this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// UI UPDATE: Loading Splash Screen Management
const LoadingSplash = {
    element: null,
    
    show() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.id = 'loadingSplash';
            this.element.innerHTML = `
                <div class="logo">
                    <i class="fas fa-crosshairs"></i>
                    RADAR
                </div>
                <div class="loader"></div>
                <div class="loading-text">Завантаження системи...</div>
            `;
            document.body.appendChild(this.element);
        }
        this.element.style.display = 'flex';
    },
    
    hide() {
        if (this.element) {
            setTimeout(() => {
                this.element.style.animation = 'splashFadeOut 0.8s ease forwards';
                setTimeout(() => {
                    if (this.element && this.element.parentElement) {
                        this.element.parentElement.removeChild(this.element);
                        this.element = null;
                    }
                }, 800);
            }, 500); // Show for at least 500ms
        }
    },
    
    updateText(text) {
        if (this.element) {
            const textElement = this.element.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = text;
            }
        }
    }
};

// UI UPDATE: FAB (Floating Action Button) Toggle for Panel
const FABToggle = {
    button: null,
    panel: null,
    isOpen: false,
    
    init() {
        // Check if FAB already exists
        if (document.querySelector('.fab-toggle')) {
            this.button = document.querySelector('.fab-toggle');
        } else {
            // Create FAB button
            this.button = document.createElement('button');
            this.button.className = 'fab-toggle';
            this.button.innerHTML = '<i class="fas fa-bars"></i>';
            this.button.setAttribute('aria-label', 'Toggle panel');
            document.body.appendChild(this.button);
        }
        
        this.panel = document.getElementById('sidePanel');
        
        if (this.button && this.panel) {
            this.button.addEventListener('click', () => this.toggle());
        }
    },
    
    toggle() {
        if (!this.panel) return;
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            this.open();
        } else {
            this.close();
        }
    },
    
    open() {
        if (!this.panel) return;
        
        this.panel.classList.remove('collapsed');
        this.panel.classList.add('open');
        this.isOpen = true;
        
        if (this.button) {
            this.button.innerHTML = '<i class="fas fa-times"></i>';
        }
        
        // UI UPDATE: Show notification
        UINotifications.info('Панель відкрита', 2000);
    },
    
    close() {
        if (!this.panel) return;
        
        this.panel.classList.remove('open');
        this.panel.classList.add('collapsed');
        this.isOpen = false;
        
        if (this.button) {
            this.button.innerHTML = '<i class="fas fa-bars"></i>';
        }
    }
};

// UI UPDATE: Enhanced Popup Management
const PopupManager = {
    activePopups: new Map(),
    
    // UI UPDATE: Create enhanced popup content with modern design
    createPopupContent(target) {
        const speed = target.speed || 0;
        const course = target.course || 0;
        const type = target.type || 'невідома ціль';
        const lastUpdate = target.lastUpdate ? new Date(target.lastUpdate).toLocaleTimeString('uk-UA') : 'N/A';
        
        return `
            <div class="target-info-window">
                <h4>
                    <i class="fas fa-crosshairs"></i>
                    <strong>${target.name || 'Ціль'}</strong>
                </h4>
                <p><i class="fas fa-bullseye"></i><strong>Тип:</strong> ${type}</p>
                <p><i class="fas fa-tachometer-alt"></i><strong>Швидкість:</strong> ${speed.toFixed(0)} км/год</p>
                <p><i class="fas fa-compass"></i><strong>Курс:</strong> ${course.toFixed(0)}°</p>
                <p><i class="fas fa-map-marker-alt"></i><strong>Координати:</strong> ${target.latitude.toFixed(4)}, ${target.longitude.toFixed(4)}</p>
                <p><i class="fas fa-clock"></i><strong>Оновлено:</strong> ${lastUpdate}</p>
            </div>
        `;
    },
    
    // UI UPDATE: Update popup with animation
    updatePopup(targetId, target) {
        const marker = window.markers && window.markers[targetId];
        if (!marker) return;
        
        const popup = marker.getPopup();
        if (popup && marker.isPopupOpen()) {
            const newContent = this.createPopupContent(target);
            popup.setContent(newContent);
            popup.update();
            
            // UI UPDATE: Show update notification
            if (this.activePopups.has(targetId)) {
                UINotifications.info(`Popup оновлено: ${target.name}`, 2000);
            }
            this.activePopups.set(targetId, true);
        }
    },
    
    // UI UPDATE: Animate popup opening
    animateOpen(popup) {
        if (popup && popup._container) {
            popup._container.style.animation = 'popupScaleIn 0.3s ease';
        }
    }
};

// UI UPDATE: Target Marker Animation Manager
const MarkerAnimations = {
    animatingMarkers: new Map(),
    
    // UI UPDATE: Add pulsing glow to moving target
    addMovingGlow(markerId) {
        const marker = window.markers && window.markers[markerId];
        if (!marker || !marker._icon) return;
        
        const icon = marker._icon.querySelector('.rotatable-png-icon');
        if (icon && !icon.classList.contains('moving')) {
            icon.classList.add('moving');
            this.animatingMarkers.set(markerId, true);
        }
    },
    
    // UI UPDATE: Remove glow when target stops
    removeMovingGlow(markerId) {
        const marker = window.markers && window.markers[markerId];
        if (!marker || !marker._icon) return;
        
        const icon = marker._icon.querySelector('.rotatable-png-icon');
        if (icon && icon.classList.contains('moving')) {
            icon.classList.remove('moving');
            this.animatingMarkers.delete(markerId);
        }
    },
    
    // UI UPDATE: Smooth rotation animation
    rotateTo(markerId, newCourse, duration = 500) {
        const marker = window.markers && window.markers[markerId];
        if (!marker || !marker._icon) return;
        
        const icon = marker._icon.querySelector('.rotatable-png-icon');
        if (!icon) return;
        
        // Get current rotation
        const currentTransform = icon.style.transform || 'rotate(0deg)';
        const currentRotation = parseFloat(currentTransform.match(/rotate\(([-\d.]+)deg\)/)?.[1] || 0);
        
        // Calculate new rotation (add 90 for icon offset)
        const targetRotation = newCourse + 90;
        
        // Animate rotation
        icon.style.transition = `transform ${duration}ms ease`;
        icon.style.transform = `rotate(${targetRotation}deg)`;
        
        // UI UPDATE: Show course change notification
        if (Math.abs(targetRotation - currentRotation) > 15) {
            const target = window.targets?.find(t => t.id === markerId);
            if (target) {
                UINotifications.warning(`Ціль ${target.name} змінила курс на ${newCourse.toFixed(0)}°`, 2500);
            }
        }
    },
    
    // UI UPDATE: Blink animation on update
    blinkMarker(markerId) {
        const marker = window.markers && window.markers[markerId];
        if (!marker || !marker._icon) return;
        
        const icon = marker._icon.querySelector('.rotatable-png-icon');
        if (icon) {
            icon.classList.add('blink-marker');
            setTimeout(() => {
                icon.classList.remove('blink-marker');
            }, 500);
        }
    }
};

// UI UPDATE: Trajectory Animation Manager
const TrajectoryAnimations = {
    activeTrajectories: new Map(),
    
    // UI UPDATE: Add glow effect to trajectory
    addGlow(trajectoryId, polyline) {
        if (!polyline) return;
        
        const element = polyline._path || polyline._renderer._container.querySelector(`path[data-id="${trajectoryId}"]`);
        if (element) {
            element.style.filter = 'drop-shadow(0 0 6px currentColor)';
            this.activeTrajectories.set(trajectoryId, polyline);
        }
    },
    
    // UI UPDATE: Create gradient effect on trajectory
    addGradient(trajectoryId, polyline, fromColor, toColor) {
        if (!polyline) return;
        
        // Note: This is a placeholder for gradient implementation
        // Leaflet polylines don't support gradients directly
        // But we can use the glow effect as an alternative
        this.addGlow(trajectoryId, polyline);
    },
    
    // UI UPDATE: Fade out trajectory when complete
    fadeOut(trajectoryId, duration = 1000) {
        const polyline = this.activeTrajectories.get(trajectoryId);
        if (!polyline) return;
        
        const element = polyline._path;
        if (element) {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (window.map && polyline) {
                    window.map.removeLayer(polyline);
                }
                this.activeTrajectories.delete(trajectoryId);
            }, duration);
        }
    },
    
    // UI UPDATE: Animate trajectory drawing
    animateDraw(polyline, duration = 2000) {
        if (!polyline || !polyline._path) return;
        
        const path = polyline._path;
        const length = path.getTotalLength();
        
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        path.style.transition = `stroke-dashoffset ${duration}ms ease`;
        
        requestAnimationFrame(() => {
            path.style.strokeDashoffset = '0';
        });
    }
};

// UI UPDATE: Enhanced Button Interactions
const ButtonEffects = {
    // UI UPDATE: Add ripple effect on click
    addRipple(button, event) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.pointerEvents = 'none';
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentElement) {
                ripple.parentElement.removeChild(ripple);
            }
        }, 600);
    },
    
    // UI UPDATE: Initialize all button effects
    init() {
        // Add ripple effect to all buttons
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, .btn, .action-button');
            if (button && !button.hasAttribute('data-no-ripple')) {
                this.addRipple(button, e);
            }
        });
    }
};

// UI UPDATE: Smooth Scroll for Panel
const SmoothScroll = {
    init() {
        const panel = document.getElementById('sidePanel');
        if (panel) {
            panel.style.scrollBehavior = 'smooth';
        }
        
        // Apply to other scrollable elements
        const scrollables = document.querySelectorAll('.targets-list, .search-results');
        scrollables.forEach(el => {
            el.style.scrollBehavior = 'smooth';
        });
    }
};

// UI UPDATE: Performance Optimization
const PerformanceOptimizer = {
    init() {
        // Add will-change to animated elements
        const animatedElements = document.querySelectorAll('.rotatable-png-icon, .fab-toggle, .panel');
        animatedElements.forEach(el => {
            el.style.willChange = 'transform, opacity';
        });
        
        // Use requestAnimationFrame for smooth animations
        this.setupRAF();
    },
    
    setupRAF() {
        // This will be used by animation functions
        window.requestAnimFrame = (function() {
            return window.requestAnimationFrame ||
                   window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame ||
                   function(callback) {
                       window.setTimeout(callback, 1000 / 60);
                   };
        })();
    }
};

// UI UPDATE: Initialize all UI systems
function initializeUI() {
    console.log('UI UPDATE: Initializing modern UI system...');
    
    // Show loading splash
    LoadingSplash.show();
    
    // Initialize notification system
    UINotifications.init();
    
    // Initialize FAB toggle
    FABToggle.init();
    
    // Initialize button effects
    ButtonEffects.init();
    
    // Initialize smooth scroll
    SmoothScroll.init();
    
    // Initialize performance optimizations
    PerformanceOptimizer.init();
    
    // Hide loading splash after initialization
    setTimeout(() => {
        LoadingSplash.hide();
        UINotifications.success('Систему завантажено успішно!', 3000);
    }, 1500);
    
    console.log('UI UPDATE: Modern UI system initialized successfully!');
}

// UI UPDATE: Expose API for use by main application
window.UI = {
    notifications: UINotifications,
    splash: LoadingSplash,
    fab: FABToggle,
    popup: PopupManager,
    markers: MarkerAnimations,
    trajectories: TrajectoryAnimations,
    buttons: ButtonEffects,
    init: initializeUI
};

// UI UPDATE: Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}

// UI UPDATE: Add CSS for ripple effect dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// UI UPDATE: Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UINotifications,
        LoadingSplash,
        FABToggle,
        PopupManager,
        MarkerAnimations,
        TrajectoryAnimations,
        ButtonEffects,
        initializeUI
    };
}
