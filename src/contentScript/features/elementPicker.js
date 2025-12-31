// Element picker feature module
import { browserApi } from "../core/browserApi.js";
import { settings } from "../core/settings.js";
import { rebuildCommandList } from "./commandBar.js";
import { isCommandOverlayOpen, closeCommandOverlay } from "./commandBar.js";
import llmEditingStyles from "../styles/llmEditing.css?raw";
import elementPickerStyles from "../styles/elementPicker.css?raw";

// State
let elementPickerOverlay = null;
let highlightedElement = null;
let highlightBox = null;
let submenuMode = false;
let menuTriggerElement = null;
let llmEditingOverlay = null;
let elementPickerActive = false;

// LLM Editing Overlay Styles
function ensurellmEditingStyles() {
  if (document.getElementById("oz-ai-editing-style")) return;
  const style = document.createElement("style");
  style.id = "oz-ai-editing-style";
  style.textContent = llmEditingStyles;
  document.documentElement.appendChild(style);
}

export function closellmEditingOverlay() {
  if (llmEditingOverlay && llmEditingOverlay.parentNode) {
    llmEditingOverlay.parentNode.removeChild(llmEditingOverlay);
  }
  llmEditingOverlay = null;
}

function openllmEditingOverlay() {
  ensurellmEditingStyles();
  
  if (llmEditingOverlay) {
    return;
  }

  const state = settings.getState();
  const darkModeEnabled = state.darkModeEnabled;

  const backdrop = document.createElement("div");
  backdrop.className =
    "oz-ai-editing-backdrop " + (darkModeEnabled ? "oz-ai-editing-dark" : "oz-ai-editing-light");

  const modal = document.createElement("div");
  modal.className =
    "oz-ai-editing-modal " + (darkModeEnabled ? "oz-ai-editing-dark" : "oz-ai-editing-light");

  modal.innerHTML = `
    <div class="oz-ai-editing-title">
      <span>Editing shortcut name</span>
      <span class="oz-ai-editing-chip">Gemini</span>
    </div>
    <div class="oz-ai-editing-message">
      Using an LLM to format your shortcut name...
    </div>
  `;

  backdrop.appendChild(modal);
  document.documentElement.appendChild(backdrop);

  llmEditingOverlay = backdrop;
}

// Element Picker Styles
function ensureElementPickerStyles() {
  if (document.getElementById("oz-element-picker-style")) return;
  const style = document.createElement("style");
  style.id = "oz-element-picker-style";
  style.textContent = elementPickerStyles;
  document.documentElement.appendChild(style);
}

// Selector generation
function getElementSelector(element) {
  if (!element || !element.tagName) return null;

  const tagName = element.tagName.toLowerCase();

  // For buttons and interactive elements, prioritize aria-label/title over IDs
  // (Outlook uses dynamic numeric IDs that aren't reliable)
  const isButtonOrInteractive = tagName === "button" || 
                                 element.getAttribute("role") === "button" ||
                                 element.getAttribute("role") === "link";

  if (isButtonOrInteractive) {
    // Strategy 1 for buttons: aria-label (most reliable for Outlook)
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) {
      const testSelector = `${tagName}[aria-label="${CSS.escape(ariaLabel)}"]`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
    }

    // Strategy 2 for buttons: title attribute
    const title = element.getAttribute("title");
    if (title && title.trim()) {
      const testSelector = `${tagName}[title="${CSS.escape(title)}"]`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
    }

    // Strategy 3 for buttons: name attribute
    const name = element.getAttribute("name");
    if (name && name.trim()) {
      const testSelector = `${tagName}[name="${CSS.escape(name)}"]`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
    }

    // Strategy 4 for buttons: role + aria-label combination
    const role = element.getAttribute("role");
    if (role && ariaLabel && ariaLabel.trim()) {
      const testSelector = `${tagName}[role="${CSS.escape(role)}"][aria-label="${CSS.escape(ariaLabel)}"]`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
    }

    // Strategy 5 for buttons: text content (for Outlook buttons without aria-label)
    const text = (element.textContent || "").trim();
    if (text && text.length < 100) {
      const allButtons = Array.from(document.querySelectorAll(tagName));
      const matchingByText = allButtons.filter(btn => {
        const btnText = (btn.textContent || "").trim();
        return btnText === text;
      });
      if (matchingByText.length === 1) {
        // Use aria-label or title if available, otherwise use text-based selector
        if (ariaLabel && ariaLabel.trim()) {
          return `${tagName}[aria-label="${CSS.escape(ariaLabel)}"]`;
        }
        if (title && title.trim()) {
          return `${tagName}[title="${CSS.escape(title)}"]`;
        }
      }
    }

    // Only use ID for buttons as last resort (and skip numeric IDs which are dynamic)
    if (element.id && element.id.trim()) {
      const idValue = element.id.trim();
      // Skip purely numeric IDs (like "11000") as they're likely dynamic
      if (!/^\d+$/.test(idValue)) {
        return `#${CSS.escape(idValue)}`;
      }
    }
  } else {
    // For non-buttons, use ID first (original behavior)
    if (element.id && element.id.trim()) {
      return `#${CSS.escape(element.id)}`;
    }
  }

  // Strategy 2: Unique data attributes (common in modern web apps)
  const dataAttrs = Array.from(element.attributes || []).filter(attr => 
    attr.name.startsWith('data-') && attr.value
  );
  for (const attr of dataAttrs) {
    const testSelector = `${tagName}[${attr.name}="${CSS.escape(attr.value)}"]`;
    const matches = document.querySelectorAll(testSelector);
    if (matches.length === 1) {
      return testSelector;
    }
  }

  // Strategy 3: aria-label (for non-button elements, already handled for buttons above)
  if (!isButtonOrInteractive) {
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) {
      const testSelector = `${tagName}[aria-label="${CSS.escape(ariaLabel)}"]`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
    }
  }

  // Strategy 4: name attribute (good for forms)
  const name = element.getAttribute("name");
  if (name && name.trim() && !isButtonOrInteractive) {
    const testSelector = `${tagName}[name="${CSS.escape(name)}"]`;
    const matches = document.querySelectorAll(testSelector);
    if (matches.length === 1) {
      return testSelector;
    }
  }

  // Strategy 5: role + aria-label combination (for non-button elements)
  if (!isButtonOrInteractive) {
    const role = element.getAttribute("role");
    const ariaLabel = element.getAttribute("aria-label");
    if (role && ariaLabel && ariaLabel.trim()) {
      const testSelector = `${tagName}[role="${CSS.escape(role)}"][aria-label="${CSS.escape(ariaLabel)}"]`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
    }
  }

  // Strategy 6: title attribute (for non-button elements)
  if (!isButtonOrInteractive) {
    const title = element.getAttribute("title");
    if (title && title.trim()) {
      const testSelector = `${tagName}[title="${CSS.escape(title)}"]`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
    }
  }

  // Strategy 7: Build a unique path using parent context
  // Find a unique parent with an ID or data attribute, then build path
  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 5) {
    if (current.id && current.id.trim()) {
      // Build selector from parent ID down to element
      const path = getPathFromParent(current, element);
      if (path) {
        const testSelector = `#${CSS.escape(current.id)} ${path}`;
        const matches = document.querySelectorAll(testSelector);
        if (matches.length === 1) {
          return testSelector;
        }
      }
      break;
    }
    // Check for data attributes in parent
    for (const attr of Array.from(current.attributes || [])) {
      if (attr.name.startsWith('data-') && attr.value) {
        const path = getPathFromParent(current, element);
        if (path) {
          const testSelector = `${current.tagName.toLowerCase()}[${attr.name}="${CSS.escape(attr.value)}"] ${path}`;
          const matches = document.querySelectorAll(testSelector);
          if (matches.length === 1) {
            return testSelector;
          }
        }
        break;
      }
    }
    current = current.parentElement;
    depth++;
  }

  // Strategy 8: Class-based with nth-of-type fallback
  if (element.className && typeof element.className === "string") {
    const classes = element.className.trim().split(/\s+/).filter(c => c && !c.includes('_'));
    if (classes.length > 0) {
      // Try first meaningful class
      const testSelector = `${tagName}.${CSS.escape(classes[0])}`;
      const matches = document.querySelectorAll(testSelector);
      if (matches.length === 1) {
        return testSelector;
      }
      // If multiple matches, add nth-of-type
      const index = Array.from(element.parentElement?.children || []).indexOf(element);
      if (index >= 0) {
        return `${tagName}.${CSS.escape(classes[0])}:nth-of-type(${index + 1})`;
      }
    }
  }

  // Strategy 9: Use text content with exact match
  const text = (element.textContent || "").trim();
  if (text && text.length < 100) {
    // Find element by text content
    const allElements = Array.from(document.querySelectorAll(tagName));
    const matchingByText = allElements.filter(el => {
      const elText = (el.textContent || "").trim();
      return elText === text;
    });
    if (matchingByText.length === 1) {
      // Use nth-of-type as fallback
      const parent = element.parentElement;
      if (parent) {
        const index = Array.from(parent.children).filter(
          child => child.tagName === element.tagName
        ).indexOf(element);
        if (index >= 0) {
          return `${tagName}:nth-of-type(${index + 1})`;
        }
      }
    }
  }

  // Last resort: tag name with nth-of-type
  const parent = element.parentElement;
  if (parent) {
    const index = Array.from(parent.children).filter(
      child => child.tagName === element.tagName
    ).indexOf(element);
    if (index >= 0) {
      return `${tagName}:nth-of-type(${index + 1})`;
    }
  }

  return tagName;
}

function getPathFromParent(parent, target) {
  const path = [];
  let current = target;
  
  while (current && current !== parent) {
    const tagName = current.tagName.toLowerCase();
    const parentEl = current.parentElement;
    if (!parentEl) break;
    
    const siblings = Array.from(parentEl.children).filter(
      child => child.tagName === current.tagName
    );
    const index = siblings.indexOf(current);
    
    if (index >= 0 && siblings.length > 1) {
      path.unshift(`${tagName}:nth-of-type(${index + 1})`);
    } else {
      path.unshift(tagName);
    }
    
    current = parentEl;
    if (path.length > 10) break; // Safety limit
  }
  
  return path.join(" > ");
}

// Element description helpers
function getElementDescription(element) {
  if (!element) return "Unknown element";

  // Priority 1: aria-label (most descriptive)
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) {
    return formatDescription(ariaLabel.trim());
  }

  // Priority 2: title attribute
  const title = element.getAttribute("title");
  if (title && title.trim()) {
    return formatDescription(title.trim());
  }

  // Priority 3: button/input value
  if (element.tagName === "INPUT" || element.tagName === "BUTTON") {
    const value = element.getAttribute("value");
    if (value && value.trim()) {
      return formatDescription(value.trim());
    }
  }

  // Priority 4: text content (cleaned up)
  const text = (element.textContent || "").trim();
  if (text) {
    // Clean up text: remove extra whitespace, limit length
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned.length > 0) {
      // Limit to reasonable length
      const maxLength = 60;
      if (cleaned.length > maxLength) {
        return formatDescription(cleaned.slice(0, maxLength).trim() + "…");
      }
      return formatDescription(cleaned);
    }
  }

  // Priority 5: alt text for images
  const alt = element.getAttribute("alt");
  if (alt && alt.trim()) {
    return formatDescription(alt.trim());
  }

  // Priority 6: placeholder for inputs
  const placeholder = element.getAttribute("placeholder");
  if (placeholder && placeholder.trim()) {
    return `Input: ${formatDescription(placeholder.trim())}`;
  }

  // Priority 7: type attribute for inputs
  const type = element.getAttribute("type");
  if (type && element.tagName === "INPUT") {
    return `Input (${type})`;
  }

  // Priority 8: role attribute
  const role = element.getAttribute("role");
  if (role) {
    const roleFormatted = role.replace(/-/g, " ");
    return `${roleFormatted.charAt(0).toUpperCase() + roleFormatted.slice(1)}`;
  }

  // Fallback: tag name capitalized
  const tagName = element.tagName.toLowerCase();
  return tagName.charAt(0).toUpperCase() + tagName.slice(1);
}

function formatDescription(text) {
  if (!text) return text;
  // Clean up the text: remove extra whitespace, trim
  let cleaned = text.trim().replace(/\s+/g, " ");
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Limit length for display
  const maxLength = 60;
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim() + "…";
  }
  
  return cleaned;
}

// Highlighting
function updateElementHighlight(element) {
  if (!element || !element.getBoundingClientRect) return;
  if (highlightedElement === element) return;

  highlightedElement = element;

  if (!highlightBox) {
    highlightBox = document.createElement("div");
    highlightBox.className = "oz-element-picker-highlight";
    document.body.appendChild(highlightBox);
  }

  const rect = element.getBoundingClientRect();
  highlightBox.style.left = `${rect.left + window.scrollX}px`;
  highlightBox.style.top = `${rect.top + window.scrollY}px`;
  highlightBox.style.width = `${rect.width}px`;
  highlightBox.style.height = `${rect.height}px`;

  // Update tooltip
  let tooltip = document.querySelector(".oz-element-picker-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "oz-element-picker-tooltip";
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = getElementDescription(element);
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.top + window.scrollY - 40}px`;
}

function removeElementHighlight() {
  if (highlightBox && highlightBox.parentNode) {
    highlightBox.parentNode.removeChild(highlightBox);
    highlightBox = null;
  }
  const tooltip = document.querySelector(".oz-element-picker-tooltip");
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
  }
  highlightedElement = null;
}

// Element finding helpers
function findActionableElement(element) {
  if (!element) return null;

  // Check if the element itself is actionable
  const tagName = element.tagName ? element.tagName.toLowerCase() : "";
  const isActionable = 
    tagName === "button" ||
    tagName === "a" ||
    tagName === "input" ||
    tagName === "select" ||
    element.getAttribute("role") === "button" ||
    element.getAttribute("role") === "link" ||
    element.getAttribute("role") === "menuitem" ||
    element.getAttribute("role") === "tab" ||
    element.onclick ||
    element.getAttribute("tabindex") !== null ||
    (element.getAttribute("aria-label") && (tagName === "div" || tagName === "span"));

  if (isActionable) {
    return element;
  }

  // Walk up the DOM tree to find the nearest actionable parent
  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 5) {
    const currentTag = current.tagName ? current.tagName.toLowerCase() : "";
    const currentIsActionable = 
      currentTag === "button" ||
      currentTag === "a" ||
      currentTag === "input" ||
      currentTag === "select" ||
      current.getAttribute("role") === "button" ||
      current.getAttribute("role") === "link" ||
      current.getAttribute("role") === "menuitem" ||
      current.getAttribute("role") === "tab" ||
      current.onclick ||
      current.getAttribute("tabindex") !== null;
    
    if (currentIsActionable) {
      return current;
    }
    current = current.parentElement;
    depth++;
  }

  // Also check children for buttons/links (in case user hovered over a wrapper)
  if (element.querySelector) {
    const buttonChild = element.querySelector("button, a[href], input[type='button'], input[type='submit'], [role='button']");
    if (buttonChild) {
      return buttonChild;
    }
  }

  return null;
}

function mightOpenMenu(element) {
  if (!element) return false;
  
  // Check for attributes that indicate a menu/dropdown
  const hasPopup = element.getAttribute("aria-haspopup");
  if (hasPopup && (hasPopup === "true" || hasPopup === "menu" || hasPopup === "listbox")) {
    return true;
  }
  
  // Check for role that indicates menu trigger
  const role = element.getAttribute("role");
  if (role === "menuitem" || role === "button") {
    // Check if it's inside a menu structure
    const parentMenu = element.closest('[role="menu"], [role="menubar"]');
    if (parentMenu && hasPopup) {
      return true;
    }
  }
  
  // Check for common Outlook menu button patterns
  const ariaExpanded = element.getAttribute("aria-expanded");
  if (ariaExpanded === "false" || ariaExpanded === null) {
    // Might expand to show a menu
    const hasDropdownClass = element.className && 
      (element.className.includes("dropdown") || 
       element.className.includes("menu") ||
       element.getAttribute("data-toggle") === "dropdown");
    if (hasDropdownClass) {
      return true;
    }
  }
  
  return false;
}

function findOpenMenu() {
  // Look for visible menus/dropdowns
  const menuSelectors = [
    '[role="menu"]:not([aria-hidden="true"])',
    '[role="listbox"]:not([aria-hidden="true"])',
    '.ms-Callout:not([aria-hidden="true"])',
    '[data-focus-zone]:not([aria-hidden="true"])',
    '[aria-expanded="true"][role="menu"]',
    '[aria-expanded="true"][role="listbox"]'
  ];
  
  for (const selector of menuSelectors) {
    const menus = document.querySelectorAll(selector);
    for (const menu of menus) {
      const rect = menu.getBoundingClientRect();
      // Check if menu is visible
      if (rect.width > 0 && rect.height > 0 && 
          window.getComputedStyle(menu).display !== "none" &&
          window.getComputedStyle(menu).visibility !== "hidden") {
        return menu;
      }
    }
  }
  
  return null;
}

// API calls
function requestElementDescriptionFormat(elementInfo) {
  return new Promise((resolve) => {
    try {
      browserApi.runtime.sendMessage(
        {
          type: "oz-format-element-description",
          elementInfo: elementInfo || {}
        },
        (response) => {
          if (browserApi.runtime && browserApi.runtime.lastError) {
            resolve({
              ok: false,
              error: "Could not reach the background script for formatting."
            });
            return;
          }
          if (!response) {
            resolve({ ok: false, error: "Unexpected empty response from Gemini." });
            return;
          }
          resolve(response);
        }
      );
    } catch (e) {
      resolve({
        ok: false,
        error: "Unexpected error while requesting element description formatting."
      });
    }
  });
}

// Event handlers
function handleElementPickerMouseMove(event) {
  if (!elementPickerActive) return;

  const target = event.target;
  if (!target || target === elementPickerOverlay || target === highlightBox) {
    removeElementHighlight();
    return;
  }

  // Skip our own overlay elements
  if (target.classList.contains("oz-element-picker-highlight") ||
      target.classList.contains("oz-element-picker-tooltip") ||
      target.classList.contains("oz-element-picker-instructions")) {
    return;
  }

  // In submenu mode, only highlight items within the open menu
  if (submenuMode) {
    const openMenu = findOpenMenu();
    if (openMenu) {
      // Check if target is within the open menu
      if (!openMenu.contains(target) && target !== openMenu) {
        removeElementHighlight();
        return;
      }
    }
  }

  // Find the actual actionable element (button, link, etc.)
  const actionableElement = findActionableElement(target);
  
  if (actionableElement) {
    updateElementHighlight(actionableElement);
  } else {
    removeElementHighlight();
  }
}

function handleElementPickerClick(event) {
  if (!elementPickerActive) return;

  // Find the actionable element from the click target
  const actionableElement = findActionableElement(event.target);
  if (!actionableElement) {
    // If no actionable element found, try the highlighted one
    if (!highlightedElement) {
      // Allow click to proceed if we don't have a target
      return;
    }
  }

  const elementToSave = actionableElement || highlightedElement;
  
  if (elementToSave) {
    // Check if this element might open a menu
    if (!submenuMode && mightOpenMenu(elementToSave)) {
      // Temporarily remove our click listener to let the natural click go through
      document.removeEventListener("click", handleElementPickerClick, true);
      
      // Allow the click to proceed naturally
      // We'll set a flag and check for menu after a short delay
      window.setTimeout(() => {
        // Re-add our click listener
        document.addEventListener("click", handleElementPickerClick, true);
        
        // Wait a bit more for menu to appear, then check
        let attempts = 0;
        const maxAttempts = 30; // 1.5 seconds total
        const checkMenu = () => {
          attempts++;
          const menu = findOpenMenu();
          
          if (menu) {
            // Menu opened! Enter submenu mode
            submenuMode = true;
            menuTriggerElement = elementToSave;
            
            // Update instructions
            const instructions = document.querySelector(".oz-element-picker-instructions");
            if (instructions) {
              instructions.textContent = "Menu opened! Select an item from the menu, or press Esc to go back.";
            }
            
            // Remove highlight temporarily
            removeElementHighlight();
          } else if (attempts < maxAttempts) {
            // Keep checking
            window.setTimeout(checkMenu, 50);
          } else {
            // Menu didn't open, treat as regular element
            selectElement(elementToSave);
          }
        };
        
        window.setTimeout(checkMenu, 100);
      }, 10);
      
      // Don't prevent default - let the click go through naturally
      return;
    } else {
      // Regular element selection - prevent default
      event.preventDefault();
      event.stopPropagation();
      selectElement(elementToSave);
    }
  }
}

function handleElementPickerKeyDown(event) {
  if (!elementPickerActive) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    
    if (submenuMode) {
      // Exit submenu mode and go back to normal picker
      submenuMode = false;
      menuTriggerElement = null;
      
      // Try to close any open menus
      try {
        // Press Escape to close the menu
        const escEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true
        });
        document.activeElement?.dispatchEvent(escEvent);
      } catch (e) {
        // Ignore errors
      }
      
      // Update instructions
      const instructions = document.querySelector(".oz-element-picker-instructions");
      if (instructions) {
        instructions.textContent = "Hover over an element to highlight it, then click to add it as a shortcut. Press Esc to cancel.";
      }
    } else {
      closeElementPicker();
    }
  }
}

// Element selection and saving
function selectElement(elementToSave) {
  const selector = getElementSelector(elementToSave);
  let description = getElementDescription(elementToSave);
  
  if (!selector) return;
  
  // Collect element information for Gemini formatting
  const elementInfo = {
    selector: selector,
    currentDescription: description,
    tagName: elementToSave.tagName ? elementToSave.tagName.toLowerCase() : "",
    ariaLabel: elementToSave.getAttribute("aria-label") || "",
    title: elementToSave.getAttribute("title") || "",
    textContent: elementToSave.textContent ? elementToSave.textContent.trim().substring(0, 200) : "",
    role: elementToSave.getAttribute("role") || ""
  };
  
  const state = settings.getState();
  const aiTitleEditingEnabled = state.aiTitleEditingEnabled;
  
  // Try to format with Gemini if enabled and available, otherwise use fallback
  if (!aiTitleEditingEnabled) {
    // LLM title editing is disabled, use fallback immediately
    let finalDescription = description;
    if (description) {
      description = description.trim();
      if (description && description.length > 0) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
      }
      finalDescription = description;
    } else {
      const tagName = elementToSave.tagName ? elementToSave.tagName.toLowerCase() : "element";
      finalDescription = `Custom ${tagName} shortcut`;
    }
    saveShortcutWithDescription(selector, finalDescription, elementToSave);
    return;
  }

  // Show loading overlay while Gemini is formatting
  closeElementPicker();
  openllmEditingOverlay();

  requestElementDescriptionFormat(elementInfo).then((result) => {
    // Close LLM editing overlay before saving
    closellmEditingOverlay();
    
    let finalDescription = description;
    
    if (result && result.ok && result.title) {
      // Use Gemini-formatted title/description
      finalDescription = result.title;
    } else {
      // Fallback to current naming logic
      if (description) {
        // Remove common prefixes/suffixes that aren't user-friendly
        description = description.trim();
        // Capitalize first letter if not already
        if (description && description.length > 0) {
          description = description.charAt(0).toUpperCase() + description.slice(1);
        }
        finalDescription = description;
      } else {
        // Fallback to a generic but readable name
        const tagName = elementToSave.tagName ? elementToSave.tagName.toLowerCase() : "element";
        finalDescription = `Custom ${tagName} shortcut`;
      }
    }
    
    saveShortcutWithDescription(selector, finalDescription, elementToSave);
  });
}

function saveShortcutWithDescription(selector, finalDescription, elementToSave) {
  if (!selector) return;
  
  // Generate a unique ID for this custom shortcut
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // If we're in submenu mode, save the menu trigger selector too
  let menuTriggerSelector = null;
  if (submenuMode && menuTriggerElement) {
    menuTriggerSelector = getElementSelector(menuTriggerElement);
  }
  
  // Get current custom shortcuts from settings
  const state = settings.getState();
  const customShortcuts = state.customShortcuts || [];
  
  // Save the custom shortcut
  const newShortcut = {
    id,
    selector,
    description: finalDescription,
    shortcut: null, // Will be configured in options page
    menuTriggerSelector: menuTriggerSelector || null // Optional: selector for menu trigger
  };

  const updatedShortcuts = [...customShortcuts, newShortcut];
  
  browserApi.storage.sync.set({ customShortcuts: updatedShortcuts }, () => {
    if (browserApi.runtime && browserApi.runtime.lastError) {
      // eslint-disable-next-line no-console
      console.debug("Zero: Could not save custom shortcut:", browserApi.runtime.lastError);
      return;
    }
    
    // Rebuild command list with new custom shortcut
    rebuildCommandList();
    
    // Show success message
    closeElementPicker();
    closellmEditingOverlay();
    
    // Open options page to configure the shortcut with the shortcut ID
    try {
      browserApi.runtime.sendMessage(
        {
          type: "oz-open-options",
          shortcutId: id
        },
        () => {
          // Ignore response/errors
        }
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug("Zero: Could not open options page:", e);
    }
  });
}

// Main functions
export function startElementPicker() {
  if (elementPickerActive) return;

  elementPickerActive = true;
  ensureElementPickerStyles();

  // Close command overlay if open
  if (isCommandOverlayOpen()) {
    closeCommandOverlay();
  }

  // Create backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "oz-element-picker-backdrop";
  document.body.appendChild(backdrop);
  elementPickerOverlay = backdrop;

  // Create instructions
  const instructions = document.createElement("div");
  instructions.className = "oz-element-picker-instructions";
  instructions.textContent = "Hover over an element to highlight it, then click to add it as a shortcut. Press Esc to cancel.";
  document.body.appendChild(instructions);

  // Add event listeners
  document.addEventListener("mousemove", handleElementPickerMouseMove, true);
  document.addEventListener("click", handleElementPickerClick, true);
  document.addEventListener("keydown", handleElementPickerKeyDown, true);

  // Prevent default interactions while picker is active
  document.body.style.cursor = "crosshair";
}

export function closeElementPicker() {
  if (!elementPickerActive) return;

  elementPickerActive = false;
  submenuMode = false;
  menuTriggerElement = null;
  document.body.style.cursor = "";

  removeElementHighlight();

  if (elementPickerOverlay && elementPickerOverlay.parentNode) {
    elementPickerOverlay.parentNode.removeChild(elementPickerOverlay);
  }
  elementPickerOverlay = null;

  const instructions = document.querySelector(".oz-element-picker-instructions");
  if (instructions && instructions.parentNode) {
    instructions.parentNode.removeChild(instructions);
  }

  document.removeEventListener("mousemove", handleElementPickerMouseMove, true);
  document.removeEventListener("click", handleElementPickerClick, true);
  document.removeEventListener("keydown", handleElementPickerKeyDown, true);
}

export function executeCustomShortcut(customShortcut) {
  // If there's a menu trigger selector, open the menu first
  if (customShortcut.menuTriggerSelector) {
    const menuTrigger = document.querySelector(customShortcut.menuTriggerSelector);
    if (menuTrigger) {
      try {
        // Check if menu is already open by checking if target element is visible
        const element = document.querySelector(customShortcut.selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          if (rect.width > 0 && rect.height > 0 && 
              style.display !== "none" &&
              style.visibility !== "hidden") {
            // Menu appears to already be open, just click the element
            try {
              /** @type {HTMLElement} */ (element).click();
              return;
            } catch (e) {
              // eslint-disable-next-line no-console
              console.debug("Zero: Could not click custom shortcut element (menu already open):", e);
            }
          }
        }
        
        // Menu is not open, click the trigger to open it
        // Use mouse events to ensure it works properly
        const mouseDown = new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0
        });
        const mouseUp = new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0
        });
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0
        });
        
        menuTrigger.dispatchEvent(mouseDown);
        menuTrigger.dispatchEvent(mouseUp);
        menuTrigger.dispatchEvent(clickEvent);
        
        // Also try native click as fallback
        /** @type {HTMLElement} */ (menuTrigger).click();
        
        // Wait for menu to open, then click the target element
        let attempts = 0;
        const maxAttempts = 40; // 2 seconds total
        const tryClickTarget = () => {
          attempts++;
          const targetElement = document.querySelector(customShortcut.selector);
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const style = window.getComputedStyle(targetElement);
            // Check if element is visible
            if (rect.width > 0 && rect.height > 0 && 
                style.display !== "none" &&
                style.visibility !== "hidden") {
              try {
                // Element is visible, click it
                /** @type {HTMLElement} */ (targetElement).click();
                return;
              } catch (e) {
                // eslint-disable-next-line no-console
                console.debug("Zero: Could not click custom shortcut element:", e);
              }
            }
          }
          
          if (attempts < maxAttempts) {
            window.setTimeout(tryClickTarget, 50);
          } else {
            // eslint-disable-next-line no-console
            console.debug("Zero: Custom shortcut element did not become visible after opening menu", {
              menuTriggerSelector: customShortcut.menuTriggerSelector,
              targetSelector: customShortcut.selector
            });
          }
        };
        
        // Start checking after a short delay to allow menu to open
        window.setTimeout(tryClickTarget, 150);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("Zero: Could not click menu trigger for custom shortcut:", e);
        // Fallback: try clicking target directly
        const element = document.querySelector(customShortcut.selector);
        if (element) {
          try {
            /** @type {HTMLElement} */ (element).click();
          } catch (e2) {
            // eslint-disable-next-line no-console
            console.debug("Zero: Could not click custom shortcut element (fallback):", e2);
          }
        }
      }
    } else {
      // Menu trigger not found, try to click target directly anyway
      // eslint-disable-next-line no-console
      console.debug("Zero: Menu trigger not found:", customShortcut.menuTriggerSelector);
      const element = document.querySelector(customShortcut.selector);
      if (element) {
        try {
          /** @type {HTMLElement} */ (element).click();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug("Zero: Could not click custom shortcut element:", e);
        }
      }
    }
  } else {
    // No menu trigger, just click the element directly
    const element = document.querySelector(customShortcut.selector);
    if (element) {
      try {
        /** @type {HTMLElement} */ (element).click();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("Zero: Could not click custom shortcut element:", e);
      }
    }
  }
}

// Helper for keyboard handler
export function isElementPickerActive() {
  return elementPickerActive;
}

