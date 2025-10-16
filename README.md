# LucianoTools ComfyUI Suite

A collection of useful user interface extensions for ComfyUI to improve workflow and provide helpful feedback.

---

## Features

This suite currently includes two extensions, which can be enabled or disabled independently from the settings panel:

#### 1. Batch Confirmation
- **Safety Check:** Before running a workflow with a batch size greater than 1, a confirmation dialog will appear.
- **Prevents Accidental Runs:** Avoids accidentally starting a long render queue that you didn't intend to run.
    <div align="center">
        <img src="" alt="Batch Confirmation" >
        <p>Batch Confirmation</p>
    </div>

#### 2. Run Timer
- **Live Timer:** Shows a `MM:SS` timer next to the "Queue Prompt" button while a prompt is running.
- **Final Time:** Displays the final time with a success (✅) or error (❌) icon.
- **Run History:** Click the timer to see a history of the last 5 run times.
    <div align="center">
        <img src="" alt="Run Timer" >
        <p>Run Timer</p>
    </div>

---

## Installation

The recommended installation method is via the ComfyUI Manager.

1.  Ensure you have [ComfyUI Manager](https://github.com/ltdrdata/ComfyUI-Manager) installed.
2.  In ComfyUI, go to **Manager -> Install via Git URL**.
3.  Enter this repository's URL:
    ```
    https://github.com/ChristopherLuciano/ComfyUI-LucianoTools
    ```
4.  Click "Install" and restart ComfyUI when prompted.

## ⚠️ Troubleshooting Installation

If you see the error **`This action is not allowed with this security level configuration`** when trying to install, it means the ComfyUI Manager's security settings are blocking the installation. Here’s how to fix it.

**Step 1: Try Updating First**

First, try updating the ComfyUI Manager, as this often resolves the issue without further steps:
- Go to **Manager -> Update -> Update All**.
- Restart ComfyUI and try installing again.

**Step 2: Manually Adjust Security Level**

If updating doesn't work, you'll need to manually edit the Manager's configuration file.

1.  **Locate the `config.ini` file:**
    *   For **Manager v3.0+**, the file is usually at: `ComfyUI/user/default/ComfyUI-Manager/config.ini`
    *   For **older versions**, the file is usually at: `ComfyUI/custom_nodes/ComfyUI-Manager/config.ini`

2.  **Edit the `config.ini` file:**
    *   Open the file in a text editor (like Notepad or VS Code).
    *   Find the `[Manager]` section and change the `security_level` to `weak`.

    ```ini
    [Manager]
    security_level = weak
    ```

3.  **Save and Restart ComfyUI:**
    *   Save the changes to the file.
    *   Completely close and restart your ComfyUI server.

After restarting, you should be able to install the suite via the Git URL without any errors.

> **Security Note:** Lowering the security level carries a potential risk. Please ensure you only install extensions from trusted sources. You can change the setting back to `normal` after installation if you wish.

---

## Configuration

Both extensions can be configured in the settings panel without needing to reload the UI.

1.  Click the **Settings** icon (⚙️) in the ComfyUI menu.
2.  Find the settings for **LucianoTools**:
    - `[✔] Run Timer`
    - `[✔] Confirm Batch Run`
3.  Check or uncheck them as desired. The changes will apply instantly.

    <div align="center">
        <img src="" alt="Settings" >
        <p>Settings</p>
    </div>

