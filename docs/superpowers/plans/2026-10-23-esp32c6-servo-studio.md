# ESP32-C6 Servo Control & Sequence Recorder Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, responsive ESP32-C6 Servo Control and Sequence Recorder Studio with Arduino Core 3.0+ firmware, thread-safe PySerial manager, modern CustomTkinter GUI, and standalone Windows `.exe` packaging via PyInstaller.

**Architecture:** 
1. **Firmware:** ESP32-C6 C++ firmware utilizing Arduino-ESP32 Core 3.0+ LEDC API (`ledcAttach(pin, 50, 14)` and `ledcWrite`) on GPIO 4 with non-blocking `millis()` state machine (IDLE, SWEEP, CYCLE) and NVS sequence persistence via `<Preferences.h>`.
2. **Backend:** Thread-safe `SerialManager` in Python handling port auto-discovery, background thread reading with line buffering, thread-safe command queueing, callback dispatch, and error/disconnect resilience.
3. **Frontend:** CustomTkinter dark-mode desktop app (`ServoStudioApp`) with throttled 30ms live slider, sweep controls, sequence recorder & macro builder with JSON preset persistence, and live auto-scrolling serial console.
4. **Distribution:** Automated `build_exe.bat` and PyInstaller bundling with `--collect-all customtkinter` into `dist/ESP32C6_Servo_Studio.exe`.

**Tech Stack:** C++ (Arduino-ESP32 Core 3.0+), Python 3.13, PySerial, CustomTkinter, PyInstaller, Windows Batch.

**Spec:** Direct user specification for ESP32-C6 Servo Control & Sequence Recorder Studio.

## Global Constraints
- Target hardware: ESP32-C6, GPIO 4 servo output, 500µs to 2400µs pulse range mapped at 50Hz with 14-bit resolution.
- Arduino-ESP32 Core v3.0+ API: Strictly `ledcAttach(SERVO_PIN, 50, 14)` and `ledcWrite(SERVO_PIN, duty)`. Do NOT use legacy `ledcSetup` or `ESP32Servo`.
- Protocol: 115200 baud, newline `\n` terminated commands (`M:<angle>`, `S:<min>,<max>,<speed>`, `REC:...`, `PLAY:1`, `STOP:1`).
- Up to 30 recorded steps per macro sequence; saved to NVS via `Preferences`.
- Python GUI: CustomTkinter dark theme, thread-safe serial separation, 30ms slider throttle, zero UI freezing on disconnect.
- Output binary: `dist/ESP32C6_Servo_Studio.exe`.

## Review Focus
1. Serial Disconnect / Reconnect Mid-Operation: GUI must handle unexpected unplugging without crashing or locking the UI thread.
2. Malformed `REC:` or out-of-range parameters (`min > max`, invalid integers): Firmware and Python client must validate and reject gracefully without buffer overruns.
3. Slider Drag Flooding: 30ms throttle must send the latest angle accurately when dragged quickly without accumulating unbounded queue latency.
4. Non-blocking Sweep & Cycle in Firmware: Incoming serial commands like `STOP:1` or `M:<angle>` must interrupt running cycles immediately without delay.
5. PyInstaller Asset Collection: CustomTkinter fonts/themes and JSON presets must bundle properly so the standalone `.exe` launches smoothly.

---

### Task 1: Environment Setup & Project Scaffolding

**Files:**
- Create: `requirements.txt`
- Create: `build_exe.bat`
- Test: `tests/test_env.py`

**Interfaces:**
- Consumes: Python 3.13 (`py -3.13`)
- Produces: `venv/`, verified imports for `serial`, `customtkinter`, `PyInstaller`

- [ ] **Step 1: Write requirements.txt and build_exe.bat**
  Define dependencies: `pyserial>=3.5`, `customtkinter>=5.2.0`, `pyinstaller>=6.0.0`.
  Create `build_exe.bat` invoking PyInstaller with `--noconsole --onefile --collect-all customtkinter --name "ESP32C6_Servo_Studio" main.py`.

- [ ] **Step 2: Create virtual environment and install dependencies**
  Run: `py -3.13 -m venv venv`
  Run: `venv\Scripts\python.exe -m pip install -r requirements.txt`

- [ ] **Step 3: Write test_env.py to verify imports**
  Verify `serial`, `customtkinter`, and `PyInstaller` import cleanly.

- [ ] **Step 4: Run test_env.py**
  Run: `venv\Scripts\python.exe tests/test_env.py`
  Expected: PASS

- [ ] **Step 5: Commit scaffolding**

---

### Task 2: ESP32-C6 Firmware (`firmware/esp32c6_servo_studio/esp32c6_servo_studio.ino`)

**Files:**
- Create: `firmware/esp32c6_servo_studio/esp32c6_servo_studio.ino`

**Interfaces:**
- Consumes: Serial input at 115200 baud (`M:`, `S:`, `REC:`, `PLAY:1`, `STOP:1`)
- Produces: PWM pulse on GPIO 4 (50Hz 14-bit LEDC), Serial responses (`OK:MOVED`, `OK:SWEEP`, `OK:SAVED`, `OK:CYCLE_STARTED`, `OK:STOPPED`, `ERR:...`)

- [ ] **Step 1: Implement angle to duty conversion function**
  Map 0-180 degrees to 500µs-2400µs pulse width, then convert to 14-bit duty count at 50Hz:
  `duty = (uint32_t)((pulse_us * 16383ULL) / 20000ULL);`
  `ledcWrite(SERVO_PIN, duty);`

- [ ] **Step 2: Implement Preferences NVS storage**
  Load/save `Step` structs (`uint16_t angle`, `uint32_t wait_ms`) up to 30 steps using namespace `"servo_seq"`.

- [ ] **Step 3: Implement non-blocking state machine**
  States: `MODE_IDLE`, `MODE_SWEEP`, `MODE_CYCLE`.
  Use `millis()` checks for sweep step intervals and sequence step delays.

- [ ] **Step 4: Implement command parser**
  Parse newline-terminated serial commands:
  - `M:<angle>`
  - `S:<min>,<max>,<speed_ms>`
  - `REC:<angle1>,<wait_ms1>;<angle2>,<wait_ms2>;...`
  - `PLAY:1`
  - `STOP:1`
  Respond with `OK:...` or `ERR:...`.

- [ ] **Step 5: Verify firmware C++ syntax and structure**
  Review header imports (`Arduino.h`, `Preferences.h`), LEDC v3.0+ API usage, buffer boundaries, and flash write routines.

---

### Task 3: Thread-Safe Serial Manager (`src/serial_manager.py`)

**Files:**
- Create: `src/serial_manager.py`
- Test: `tests/test_serial_manager.py`

**Interfaces:**
- Consumes: `pyserial`, `threading`, `queue`
- Produces: `SerialManager` class with methods:
  - `list_ports() -> List[Tuple[str, str]]`
  - `connect(port: str, baudrate: int = 115200) -> bool`
  - `disconnect() -> None`
  - `is_connected() -> bool`
  - `send_command(cmd: str) -> bool`
  - `send_immediate(cmd: str) -> bool`
  - Event callbacks: `on_line_received(Callable[[str], None])`, `on_status_changed(Callable[[bool, str], None])`

- [ ] **Step 1: Write test_serial_manager.py with mock serial**
  Test command formatting, queue processing, line buffering, and callbacks with mock serial transport.

- [ ] **Step 2: Run test to verify it fails initially**
  Run: `venv\Scripts\python.exe -m unittest tests/test_serial_manager.py`
  Expected: FAIL (module not yet created)

- [ ] **Step 3: Implement SerialManager in src/serial_manager.py**
  Implement reader thread, writer queue, auto-reconnect/safe-disconnect logic, protocol string formatting (`\n` appending), and listener callbacks.

- [ ] **Step 4: Run test to verify it passes**
  Run: `venv\Scripts\python.exe -m unittest tests/test_serial_manager.py`
  Expected: PASS

- [ ] **Step 5: Commit SerialManager**

---

### Task 4: Sequence Model & Presets (`src/sequence_model.py`)

**Files:**
- Create: `src/sequence_model.py`
- Test: `tests/test_sequence_model.py`

**Interfaces:**
- Consumes: JSON serialization
- Produces: `ServoStep` dataclass, `SequenceModel` class:
  - `add_step(angle: int, wait_ms: int) -> bool`
  - `delete_step(index: int) -> bool`
  - `clear() -> None`
  - `to_protocol_string() -> str` (`REC:ang1,wait1;ang2,wait2...`)
  - `save_to_json(filepath: str) -> None`
  - `load_from_json(filepath: str) -> None`

- [ ] **Step 1: Write test_sequence_model.py**
  Test step validation (angles 0-180, wait >= 0, max 30 steps), protocol formatting, and JSON save/load roundtrip.

- [ ] **Step 2: Run test to verify failure**
  Run: `venv\Scripts\python.exe -m unittest tests/test_sequence_model.py`
  Expected: FAIL

- [ ] **Step 3: Implement SequenceModel in src/sequence_model.py**
  Implement step container, validation, protocol serialization, and JSON persistence.

- [ ] **Step 4: Run test to verify it passes**
  Run: `venv\Scripts\python.exe -m unittest tests/test_sequence_model.py`
  Expected: PASS

- [ ] **Step 5: Commit SequenceModel**

---

### Task 5: Desktop App GUI (`src/gui.py`) & Entry Point (`main.py`)

**Files:**
- Create: `src/gui.py`
- Create: `main.py`
- Test: `tests/test_gui_smoke.py`

**Interfaces:**
- Consumes: `CustomTkinter`, `SerialManager`, `SequenceModel`
- Produces: `ServoStudioApp` desktop application:
  - Top Bar: Port dropdown, Refresh Ports, Connect/Disconnect, Status badge
  - Left Panel: Live angle slider with 30ms throttling, Sweep parameters & Start/Stop
  - Right Panel: Capture angle button, custom step entry, scrollable step table, Upload, Play, Stop, Save/Load Presets
  - Bottom Bar: Auto-scrolling live console with `→` sent and `←` received logs, clear button

- [ ] **Step 1: Write test_gui_smoke.py**
  Verify GUI components instantiate without display server crash, verify slider throttling timer logic and callback registrations.

- [ ] **Step 2: Implement GUI in src/gui.py**
  Build clean CustomTkinter dark-mode layout matching user spec:
  - Responsive grid layout
  - 30ms slider dragging throttle
  - Disconnect-safe event handling
  - Preset file dialogs (`.json`)
  - Thread-safe console log appender via `root.after()`

- [ ] **Step 3: Implement main.py entry point**
  Initialize `SerialManager`, `SequenceModel`, `ServoStudioApp`, and start mainloop.

- [ ] **Step 4: Run smoke test**
  Run: `venv\Scripts\python.exe tests/test_gui_smoke.py`
  Expected: PASS

- [ ] **Step 5: Commit GUI and main.py**

---

### Task 6: Packaging & Standalone Windows `.exe` Verification

**Files:**
- Verify: `build_exe.bat`
- Produce: `dist/ESP32C6_Servo_Studio.exe`

**Interfaces:**
- Consumes: `main.py`, `src/`, `venv/Scripts/pyinstaller.exe`
- Produces: Standalone single-file Windows executable

- [ ] **Step 1: Run PyInstaller build**
  Execute `build_exe.bat` (or direct PyInstaller command with `--collect-all customtkinter`).

- [ ] **Step 2: Verify executable build output**
  Check that `dist/ESP32C6_Servo_Studio.exe` exists and has nonzero size (>15MB typical for bundled CustomTkinter + PyInstaller).

- [ ] **Step 3: Test executable execution**
  Verify the executable starts and passes headless smoke check.
