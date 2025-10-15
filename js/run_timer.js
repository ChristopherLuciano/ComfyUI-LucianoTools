import { app } from "../../scripts/app.js";

const runTimer = {
  isInitialized: false,
  elements: { container: null, display: null, history: null, style: null },
  apiListeners: {},

  async setup() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
        this.injectPulseStyle();
        const runButton = await this.waitForRunButton();
        const actionBar = runButton.closest(".actionlet-content") || runButton.closest(".actionbar-content");
        if (!actionBar) {
            console.error("[Luciano's Suite - Run Timer] Could not find action bar!");
            this.cleanup();
            return;
        }
        this.createTimerDisplay(actionBar);
        this.attachEventListeners();
    } catch (error) {
        console.error("[Luciano's Suite - Run Timer] Failed to set up:", error);
        this.cleanup();
    }
  },

  cleanup() {
    this.detachEventListeners();
    this.elements.container?.remove();
    this.elements.style?.remove();
    this.isInitialized = false;
    this.elements = { container: null, display: null, history: null, style: null };
  },

  waitForRunButton() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        const runButton = document.querySelector(".comfyui-queue-button button");
        if (runButton) { clearInterval(check); resolve(runButton); }
      }, 500);
    });
  },

  createTimerDisplay(parent) {
    const container = document.createElement("div");
    container.id = "run-timer-container";
    const timer = document.createElement("div");
    timer.id = "run-timer-display";
    timer.textContent = "⏱ 00:00";
    const history = document.createElement("div");
    history.id = "run-timer-history";
    container.appendChild(timer);
    container.appendChild(history);
    parent.appendChild(container);
    this.elements.container = container;
    this.elements.display = timer;
    this.elements.history = history;
  },

  attachEventListeners() {
    let startTime = null, timerInterval = null, isRunning = false;
    const runHistory = [];
    const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
    const resetTimerDisplay = () => {
      if (timerInterval) clearInterval(timerInterval);
      this.elements.display.textContent = "⏱ 00:00";
      this.elements.display.className = "";
      timerInterval = startTime = null; isRunning = false;
    };
    const updateHistory = (success, totalSeconds) => {
      const entry = document.createElement("div");
      entry.className = `history-entry ${success ? "success" : "fail"}`;
      entry.textContent = `${new Date().toLocaleTimeString()} — ${success ? "✅":"❌"} ${formatTime(totalSeconds)}`;
      runHistory.unshift(entry);
      if (runHistory.length > 5) runHistory.pop();
      this.elements.history.innerHTML = "";
      runHistory.forEach(e => this.elements.history.appendChild(e));
    };
    this.apiListeners = {
      execution_start: () => {
        if(isRunning) return;
        resetTimerDisplay();
        this.elements.display.classList.add("running");
        startTime = Date.now();
        isRunning = true;
        timerInterval = setInterval(() => {
          this.elements.display.textContent = `⏱ ${formatTime(Math.floor((Date.now() - startTime) / 1000))}`;
        }, 1000);
      },
      execution_stop: (success) => {
        if(!isRunning) return;
        clearInterval(timerInterval);
        const total = Math.floor((Date.now() - startTime) / 1000);
        this.elements.display.textContent = `${success ? "✅":"❌"} ${formatTime(total)}`;
        this.elements.display.classList.remove("running");
        this.elements.display.classList.add(success ? "done" : "error");
        updateHistory(success, total);
        isRunning = false;
      },
      execution_interrupted: () => {
        if(!isRunning) return;
        clearInterval(timerInterval);
        const total = Math.floor((Date.now() - startTime) / 1000);
        this.elements.display.textContent = `🚫 ${formatTime(total)}`;
        this.elements.display.classList.remove("running");
        this.elements.display.classList.add("error");
        updateHistory(false, total);
        isRunning = false;
      },
      display_click: () => this.elements.history.classList.toggle("visible"),
    };
    app.api.addEventListener("execution_start", this.apiListeners.execution_start);
    app.api.addEventListener("execution_success", () => this.apiListeners.execution_stop(true));
    app.api.addEventListener("execution_complete", () => this.apiListeners.execution_stop(true));
    app.api.addEventListener("execution_error", () => this.apiListeners.execution_stop(false));
    app.api.addEventListener("execution_interrupted", this.apiListeners.execution_interrupted);
    this.elements.display.addEventListener("click", this.apiListeners.display_click);
  },

  detachEventListeners() {
    app.api.removeEventListener("execution_start", this.apiListeners.execution_start);
    app.api.removeEventListener("execution_success", this.apiListeners.execution_stop);
    app.api.removeEventListener("execution_complete", this.apiListeners.execution_stop);
    app.api.removeEventListener("execution_error", this.apiListeners.execution_stop);
    app.api.removeEventListener("execution_interrupted", this.apiListeners.execution_interrupted);
    this.elements.display?.removeEventListener("click", this.apiListeners.display_click);
    this.apiListeners = {};
  },

  injectPulseStyle() {
    if (document.getElementById("run-timer-style")) return;
    const style = document.createElement("style");
    style.id = "run-timer-style";
    this.elements.style = style;
    style.textContent = `
        @keyframes pulseGlow { 0% { box-shadow: 0 0 5px rgba(0,255,153,0.2); } 50% { box-shadow: 0 0 15px rgba(0,255,153,0.6); } 100% { box-shadow: 0 0 5px rgba(0,255,153,0.2); } } #run-timer-display.running { animation: pulseGlow 1.5s infinite ease-in-out; background: rgba(0, 80, 0, 0.6); color: #00ff99; } #run-timer-display.done { animation: none; background: rgba(0, 0, 0, 0.5); color: #ccc; } #run-timer-display.error { animation: none; background: rgba(80, 0, 0, 0.6); color: #ff6666; } #run-timer-history { position: absolute; top: 100%; right: 12px; margin-top: 8px; z-index: 9999; display: none; flex-direction: column; font-family: monospace; font-size: 12px; color: #aaa; padding: 6px 8px; border-radius: 8px; background: rgba(10, 10, 15, 0.85); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1); max-height: 120px; overflow-y: auto; width: auto; min-width: 180px; opacity: 0; transform: translateY(-10px); transition: opacity 0.2s ease-out, transform 0.2s ease-out; box-shadow: 0 4px 15px rgba(0,0,0,0.3); } #run-timer-history.visible { display: flex; opacity: 1; transform: translateY(0); } #run-timer-history .history-entry { opacity: 0.85; margin-bottom: 3px; white-space: nowrap; } #run-timer-history .success { color: #00ff99; } #run-timer-history .fail { color: #ff6666; } #run-timer-container { position: relative; display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; } #run-timer-display { margin-left: 12px; margin-right: 12px; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold; user-select: none; transition: color 0.4s ease, background 0.4s ease, filter 0.2s; } #run-timer-display:hover { filter: brightness(1.2); }
    `;
    document.head.appendChild(style);
  },
};

app.registerExtension({
  name: "LucianoTools.RunTimer",
  setup() {
    const settingId = "Luciano.RunTimer.Enabled";

    app.ui.settings.addSetting({
      id: settingId,
      name: "Enable Run Timer",
      tooltip: "Adds a timer next to the Run Workflow button.",
      type: "boolean",
      defaultValue: true,
      category: ["LucianoTools", "Run Timer", "RunTimer"],
      onChange: async (isEnabled) => {
        if (isEnabled) {
          await runTimer.setup();
        } else {
          runTimer.cleanup();
        }
      },
    });
  },
});