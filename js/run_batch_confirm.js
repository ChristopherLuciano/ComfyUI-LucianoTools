import { app } from "../../scripts/app.js";

const batchConfirm = {
  isInitialized: false,
  originalQueuePrompt: null,

  async setup() {
    if (this.isInitialized) return;
    // Wait until the original app.queuePrompt is available
    await this.waitForQueuePrompt();

    // Store the original function before we patch it
    this.originalQueuePrompt = app.queuePrompt;

    // Apply the patch
    app.queuePrompt = this.patchedQueuePrompt.bind(this);

    this.isInitialized = true;
  },

  cleanup() {
    if (!this.isInitialized) return;

    // Restore the original function
    if (this.originalQueuePrompt) {
      app.queuePrompt = this.originalQueuePrompt;
    }

    this.isInitialized = false;
    this.originalQueuePrompt = null;
  },

  waitForQueuePrompt() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (typeof app.queuePrompt === "function" && !app.queuePrompt.isPatchedByLuciano) {
          clearInterval(check);
          resolve();
        }
      }, 250);
    });
  },

  async patchedQueuePrompt(...args) {
    try {
      const batchCount = (args && args.length > 1 && typeof args[1] === "number") ? args[1] : 1;

      if (batchCount > 1) {
        const confirmed = await this.showConfirmationDialog(batchCount);
        if (!confirmed) {
          return; // Stop the run
        }
      }

      // If confirmed or batch size is 1, call the original function
      return await this.originalQueuePrompt.apply(app, args);
    } catch (err) {
      // In case of error, still try to fall back to the original function
      return await this.originalQueuePrompt.apply(app, args);
    }
  },

  showConfirmationDialog(batchSize) {
    // This logic is mostly from your original code, just namespaced
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style = `position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: sans-serif;`;
        const dialog = document.createElement("div");
        dialog.style = `background: #222; color: white; padding: 20px 30px; border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.5); text-align: center; max-width: 400px;`;
        const msg = document.createElement("p");
        msg.textContent = `⚠️ You are about to run a batch of ${batchSize} images. Continue?`;
        const buttons = document.createElement("div");
        buttons.style = "margin-top: 20px; display: flex; justify-content: center; gap: 15px;";
        const yesBtn = document.createElement("button");
        yesBtn.textContent = "Yes, Run";
        yesBtn.style = `background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;`;
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.style = `background: #555; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;`;
        yesBtn.onclick = () => { document.body.removeChild(overlay); resolve(true); };
        cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(false); };
        buttons.appendChild(yesBtn);
        buttons.appendChild(cancelBtn);
        dialog.appendChild(msg);
        dialog.appendChild(buttons);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
  }
};

// Add a flag to the patched function to prevent re-patching
batchConfirm.patchedQueuePrompt.isPatchedByLuciano = true;

app.registerExtension({
  name: "LucianoTools.BatchConfirm",
  setup() {
    const settingId = "Luciano.BatchConfirm.Enabled";
    app.ui.settings.addSetting({
      id: settingId,
      name: "Enable Batch Confirmation",
      tooltip: "Shows a confirmation dialog before running a batch with more than 1 image.",
      type: "boolean",
      defaultValue: true,
      category: ["LucianoTools", "Confirm Batch Run", "BatchConfirm"],
      onChange: (isEnabled) => {
        if (isEnabled) {
          batchConfirm.setup();
        } else {
          batchConfirm.cleanup();
        }
      },
    });
  },
});