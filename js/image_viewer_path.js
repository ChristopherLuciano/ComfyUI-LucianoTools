import { app } from "../../scripts/app.js";

// =================================================================================
// Feature 1: Image Viewer Path Overlay
// =================================================================================
const imageViewerPath = {
    GALLERIA_MASK_SELECTOR: ".p-component-overlay, .p-galleria-mask, .p-dialog-mask", 
    
    observer: null,
    navigationObserver: null,
    enabled: false,

    setup() {
        if (this.enabled) return;
        this.enabled = true;
        console.log("[Luciano's Suite - Viewer Path] Setting up...");
        this.attachGalleriaHook();
    },

    cleanup() {
        if (!this.enabled) return;
        this.enabled = false;
        console.log("[Luciano's Suite - Viewer Path] Cleaning up...");

        if (this.observer) this.observer.disconnect();
        if (this.navigationObserver) this.navigationObserver.disconnect();
        this.observer = null;
        this.navigationObserver = null;

        const overlay = document.querySelector('#luciano-viewer-path');
        if (overlay) overlay.remove();
        
        const masks = document.querySelectorAll(this.GALLERIA_MASK_SELECTOR + "[data-luciano-initialized]");
        masks.forEach(mask => mask.removeAttribute('data-luciano-initialized'));
    },

    attachGalleriaHook() {
        if (this.observer) return;
        
        const observer = new MutationObserver((mutationsList) => {
            if (!this.enabled) return;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (!(node instanceof HTMLElement)) return;
                        const maskElement = this.GALLERIA_MASK_SELECTOR.split(', ').some(sel => node.classList.contains(sel.substring(1))) 
                                            ? node 
                                            : node.querySelector(this.GALLERIA_MASK_SELECTOR);

                        if (maskElement) {
                            setTimeout(() => this.handleModalInjection(maskElement), 100); 
                        }
                    });
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        this.observer = observer; 
    },

    
    extractImageData(imageElement) {
        if (!imageElement) return null;
        
        const srcUrl = imageElement.getAttribute("src");
        if (!srcUrl) return null;

        const query = srcUrl.split('?')[1];
        if (!query) return null;
        
        const urlParams = new URLSearchParams(query);
        const filename = urlParams.get('filename');
        
        // Get the intrinsic dimensions of the loaded image
        const width = imageElement.naturalWidth;
        const height = imageElement.naturalHeight;

        if (!filename || !width || !height) return null;

        return { filename, width, height };
    },
	 // CHANGED: This function is now renamed to be more descriptive
    extractImageDataFromActiveSlide(maskElement) {
        const activeItem = maskElement.querySelector('.p-galleria-item[data-p-active="true"]') ||
                           maskElement.querySelector('.p-galleria-item:not([style*="display: none"])');
        
        let imageElement;
        if (activeItem) {
            imageElement = activeItem.querySelector('img.galleria-image');
        } else {
            imageElement = maskElement.querySelector('img.galleria-image');
        }
        
        return this.extractImageData(imageElement);
    },
    // CHANGED: This function now formats the new data
    updatePathDisplay(maskElement) {
        if (!this.enabled) return;
        const imageData = this.extractImageDataFromActiveSlide(maskElement);
        const pathOverlay = maskElement.querySelector('#luciano-viewer-path');

        if (imageData && pathOverlay) {
            pathOverlay.textContent = `output/${imageData.filename} (${imageData.width}x${imageData.height})`;
        }
    },

    observeNavigation(galleriaComponentRoot) {
        if (!this.enabled) return;
        const config = { childList: true, subtree: true };
        const callback = (mutationsList) => {
            if (!this.enabled) return;
            let needsUpdate = mutationsList.some(m => Array.from(m.addedNodes).some(n => (n.querySelector && n.querySelector('img.galleria-image')) || n.classList?.contains('galleria-image')));
            if (needsUpdate) {
                setTimeout(() => this.updatePathDisplay(galleriaComponentRoot.closest(this.GALLERIA_MASK_SELECTOR)), 100);
            }
        };

        if (this.navigationObserver) this.navigationObserver.disconnect();
        this.navigationObserver = new MutationObserver(callback.bind(this));
        this.navigationObserver.observe(galleriaComponentRoot, config);
    },
    
   handleModalInjection(maskElement) {
        if (!this.enabled) return;
        if (maskElement.hasAttribute('data-luciano-initialized')) {
            this.updatePathDisplay(maskElement);
            return;
        }
        maskElement.setAttribute('data-luciano-initialized', 'true');

        const imageData = this.extractImageDataFromActiveSlide(maskElement); // CHANGED
        if (!imageData) return;

        // CHANGED: Format the new text
        const fullPathText = `output/${imageData.filename} (${imageData.width} x ${imageData.height})`;

        const pathOverlay = document.createElement("div");
        pathOverlay.id = "luciano-viewer-path";
        pathOverlay.textContent = fullPathText;
        
        const viewerContent = maskElement.querySelector('.p-galleria-content');
        if (viewerContent) {
            viewerContent.style.position = 'relative'; 
            pathOverlay.style = `
                position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.75); color: #00ff99; padding: 6px 12px; border-radius: 4px;
                font-family: monospace; font-size: 14px; z-index: 1000; user-select: all; max-width: 90%;
                overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
            `;
            viewerContent.appendChild(pathOverlay);
            
            const galleriaItemsContainer = maskElement.querySelector('.p-galleria-items-container') || maskElement.querySelector('.p-galleria-content');
            if (galleriaItemsContainer) {
                 this.observeNavigation(galleriaItemsContainer);
            }
        }
    
    }
};

// =================================================================================
// Feature 2: Context Menu Path Tooltip
// =================================================================================
const contextMenuPath = {
    ITEM_SELECTOR: ".task-item", 
    lastClickedFilename: null, 
    observer: null,
    rightClickHandler: null,
    enabled: false,

    setup() {
        if (this.enabled) return;
        this.enabled = true;
        console.log("[Luciano's Suite - Context Menu Path] Setting up...");
        setTimeout(() => {
            this.attachRightClickHook();
            this.observeContextMenu();
        }, 500);
    },

    cleanup(){
        if (!this.enabled) return;
        this.enabled = false;
        console.log("[Luciano's Suite - Context Menu Path] Cleaning up...");

        if (this.observer) this.observer.disconnect();
        if (this.rightClickHandler) document.removeEventListener("contextmenu", this.rightClickHandler, true);
        this.observer = null;
        this.rightClickHandler = null;

        this.manageTooltip(null, null, false);
        const customMenuItem = document.querySelector("#luciano-show-path-item");
        if (customMenuItem) customMenuItem.remove();
    },

    manageTooltip(e, text, isShow) {
        let tooltip = document.getElementById("luciano-path-tooltip");
        if (!isShow) {
            if (tooltip) tooltip.remove();
            return;
        }
        if (tooltip) tooltip.remove();
        tooltip = document.createElement("div");
        tooltip.id = "luciano-path-tooltip";
        document.body.appendChild(tooltip);
        tooltip.textContent = text;
        tooltip.style = `
            position: fixed; top: ${e.clientY + 5}px; left: ${e.clientX + 10}px; 
            background: #444; color: #fff; padding: 4px 8px; border-radius: 4px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.4); z-index: 10002;
            font-family: monospace; font-size: 12px; pointer-events: none;
        `;
    },

    _handleRightClick(e) {
        if (!this.enabled) return;
        this.lastClickedFilename = null;
        const item = e.target.closest(this.ITEM_SELECTOR); 
        if (item) {
            const imgElement = item.querySelector(".task-output-image"); 
            if (imgElement) {
                const srcUrl = imgElement.getAttribute("src");
                if (srcUrl) {
                    const query = srcUrl.split('?')[1];
                    if (query) {
                        const urlParams = new URLSearchParams(query);
                        const filename = urlParams.get('filename'); 
                        if (filename) this.lastClickedFilename = filename;
                    }
                }
            }
        }
    },

    attachRightClickHook() {
        if (!this.rightClickHandler) this.rightClickHandler = this._handleRightClick.bind(this);
        document.addEventListener("contextmenu", this.rightClickHandler, true);
    },

    observeContextMenu() {
        const targetNode = document.body;
        const config = { childList: true };
        const callback = (mutationsList) => {
            if (!this.enabled) return;
            for (const mutation of mutationsList) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement) || !node.classList.contains('p-contextmenu')) continue;
                    const menuRoot = node;
                    if (this.lastClickedFilename && !menuRoot.hasAttribute('data-luciano-processed')) {
                        menuRoot.setAttribute('data-luciano-processed', 'true');
                        const menuList = menuRoot.querySelector('.p-contextmenu-root-list');
                        if (!menuList) continue;
                        const newItem = document.createElement("li");
                        newItem.id = "luciano-show-path-item";
                        newItem.className = "p-contextmenu-item";
                        newItem.innerHTML = `
                            <div class="p-contextmenu-item-content"><a class="p-contextmenu-item-link" style="cursor: default;" tabindex="-1"><span class="p-contextmenu-item-icon pi pi-info-circle"></span><span class="p-contextmenu-item-label">Show Path</span></a></div>
                        `;
                        newItem.onmouseenter = (e) => {
                            const filename = this.lastClickedFilename;
                            if (!filename) return;
                            const pathText = `Path: output/${filename}`;
                            const rect = e.currentTarget.getBoundingClientRect();
                            this.manageTooltip({ clientX: rect.right, clientY: rect.top }, pathText, true);
                        };
                        newItem.onmouseleave = (e) => this.manageTooltip(e, null, false);
                        menuList.insertBefore(newItem, menuList.firstChild);
                    }
                }
                for (const node of mutation.removedNodes) {
                     if (!(node instanceof HTMLElement) || !node.classList.contains('p-contextmenu')) continue;
                     this.lastClickedFilename = null;
                     this.manageTooltip(null, null, false);
                }
            }
        };
        this.observer = new MutationObserver(callback.bind(this));
        this.observer.observe(targetNode, config);
    }
};

// =================================================================================
// Main Controller and Settings
// =================================================================================
const pathDisplayController = {
    setup() {
        contextMenuPath.setup();
        imageViewerPath.setup();
    },
    cleanup() {
        contextMenuPath.cleanup();
        imageViewerPath.cleanup();
    }
};

app.registerExtension({
    name: "LucianoTools.PathDisplay",
    setup(app) {
        const settingId = "Luciano.PathDisplay.Enabled";

        app.ui.settings.addSetting({
            id: settingId,
            name: "Enable Path Display",
            tooltip: "Adds a 'Show Path' tooltip to the context menu and an informational overlay on the full-screen image viewer.",
            type: "boolean",
            defaultValue: true,
            category: ["LucianoTools", "Path Display", "PathDisplay"],
            onChange: (isEnabled) => {
                if (isEnabled) {
                    pathDisplayController.setup();
                } else {
                    pathDisplayController.cleanup();
                }
            },
        });
        
        // Initial setup on page load
        if (app.ui.settings.getSettingValue(settingId)) {
            pathDisplayController.setup();
        }
    },
});