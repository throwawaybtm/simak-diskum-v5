# Speed Control for Live Movement & Sequence Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add speed control (`ms/deg`) to both live manual servo positioning and recorded macro sequences in ESP32-C6 firmware and Desktop GUI, then rebuild the standalone `.exe`.

**Architecture:**
1. **Firmware:** Update `M:<angle>[,<speed_ms>]` to interpolate angles smoothly using `millis()`. Update `ServoStep` struct to include `uint16_t speed_ms`. Update `CYCLE` state machine with two phases: TRANSIT (smooth step-by-step angle movement at `speed_ms` per degree) and DWELL (pause for `wait_ms`). Update `REC:` protocol parser to accept `REC:<ang>,<spd>,<wait>;...` with backward compatibility.
2. **Model:** Update `ServoStep` dataclass in `src/sequence_model.py` to `(angle, speed_ms, wait_ms)`. Update protocol serialization and JSON persistence with backward compatibility.
3. **GUI:** Add Live Speed slider to Left Panel. Add Step Speed controls to Right Panel. Update step list table to show Speed column. Send `M:<angle>,<speed_ms>` during live moves and `REC:<ang>,<spd>,<wait>;...` during upload.
4. **Packaging:** Run `build_exe.bat` to rebuild `dist/ESP32C6_Servo_Studio.exe` and verify.

**Tech Stack:** C++ (Arduino-ESP32 Core 3.0+), Python 3.13, PySerial, CustomTkinter, PyInstaller.

## Global Constraints
- ESP32-C6 Core v3.0+ LEDC API on GPIO 4 (`ledcAttach(4, 50, 14)` & `ledcWrite(4, duty)`).
- 115200 baud, newline `\n` terminated.
- Non-blocking `millis()` execution for both live move transitions and sequence cycles.
- Up to 30 recorded steps per sequence in NVS `<Preferences.h>`.
- Python unit test suite must stay 100% green.
- Standalone `.exe` must be updated and verified.

## Review Focus
1. Live slider dragging at non-zero speed: Ensure updating the target angle mid-transit smoothly redirects the servo to the new target without stuttering.
2. Zero speed (instant snap): Must remain supported (`speed_ms = 0`) for immediate maximum-speed response.
3. Cycle phase transitions: Transition from step transit to step dwell must not skip or freeze when `speed_ms = 0` (instant jump to dwell).
4. Backward compatibility: If an older 2-element step JSON or protocol string is received, default `speed_ms` to 0.
5. PyInstaller build: Ensure new GUI widgets render cleanly without font/theme truncation.

---

### Task 1: Update Sequence Model (`src/sequence_model.py`)

**Files:**
- Modify: `src/sequence_model.py`
- Test: `tests/test_sequence_model.py`

**Interfaces:**
- Produces: `ServoStep(angle: int, speed_ms: int, wait_ms: int)`
- Methods:
  - `add_step(angle: int, speed_ms: int, wait_ms: int) -> bool`
  - `to_protocol_string() -> str` (`REC:<ang>,<spd>,<wait>;...`)
  - `save_to_json(filepath: str)`
  - `load_from_json(filepath: str)` (handles both 2-field and 3-field formats)

- [ ] **Step 1: Write failing unit tests in `tests/test_sequence_model.py`**
  Test 3-parameter steps (`angle`, `speed_ms`, `wait_ms`), protocol output `REC:90,20,500;...`, and JSON roundtrip with speed.

- [ ] **Step 2: Run test to watch it fail**
  Run: `venv\Scripts\python.exe -m unittest tests/test_sequence_model.py`
  Expected: FAIL

- [ ] **Step 3: Update `src/sequence_model.py`**
  Add `speed_ms: int = 0` to `ServoStep` and `add_step()`. Update protocol serializer and JSON loader.

- [ ] **Step 4: Run test to verify it passes**
  Run: `venv\Scripts\python.exe -m unittest tests/test_sequence_model.py`
  Expected: PASS

- [ ] **Step 5: Commit SequenceModel changes**

---

### Task 2: Update ESP32-C6 Firmware (`esp32c6_servo_studio.ino`)

**Files:**
- Modify: `firmware/esp32c6_servo_studio/esp32c6_servo_studio.ino`

**Interfaces:**
- Consumes: `M:<angle>[,<speed_ms>]`, `REC:<ang>,<spd>,<wait>;...`
- Produces: Smooth non-blocking servo movement on GPIO 4, NVS persistence of `speed_ms`.

- [ ] **Step 1: Update `ServoStep` struct**
  Add `uint16_t speed_ms;` to `struct ServoStep`.

- [ ] **Step 2: Add non-blocking live move interpolation**
  Add `MODE_MOVE` state (or smooth interpolation state) with `target_angle`, `move_speed_ms`, and `last_move_step_time`. If `speed_ms == 0`, apply immediately; otherwise step 1° per `move_speed_ms`.

- [ ] **Step 3: Update `M:` command parser**
  Parse optional `speed_ms`: `sscanf(cmd + 2, "%d,%d", &angle, &spd)`.

- [ ] **Step 4: Update `REC:` command parser**
  Parse 3 parameters per step: `sscanf(p, "%d,%d,%lu%n", &ang, &spd, &wt, &consumed)`.

- [ ] **Step 5: Update `MODE_CYCLE` state machine**
  Implement two-phase cycle step execution:
  - Phase 1 (Transit): If `current_angle != step.angle` and `step.speed_ms > 0`, step angle towards target every `step.speed_ms`.
  - Phase 2 (Dwell): Once target angle reached (or if `step.speed_ms == 0`), dwell for `step.wait_ms`.

- [ ] **Step 6: Commit firmware changes**

---

### Task 3: Update Desktop GUI (`src/gui.py`) & Tests

**Files:**
- Modify: `src/gui.py`
- Modify: `tests/test_gui_smoke.py`

**Interfaces:**
- Produces:
  - Live speed slider in Left Panel (0 to 100 ms/deg).
  - Step speed entry/control in Right Panel.
  - Speed column in recorded steps table.
  - Transmission of `M:<angle>,<speed_ms>` and `REC:<ang>,<spd>,<wait>;...`.

- [ ] **Step 1: Write test in `tests/test_gui_smoke.py`**
  Verify slider throttler and command formatting handle speed parameter.

- [ ] **Step 2: Run test to watch it fail / verify**
  Run: `venv\Scripts\python.exe -m unittest tests/test_gui_smoke.py`

- [ ] **Step 3: Update `src/gui.py`**
  - Add Live Speed slider to Live Manual section.
  - Update `_send_manual_angle` to format `M:<angle>,<speed_ms>`.
  - Add Step Speed input to Capture and Custom Step rows.
  - Update step table rendering with Speed column.
  - Update `_capture_current_angle` and `_add_custom_step` to save speed.

- [ ] **Step 4: Run full test suite**
  Run: `venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"`
  Expected: PASS

- [ ] **Step 5: Commit GUI changes**

---

### Task 4: Rebuild Standalone Windows `.exe` & Verify

**Files:**
- Execute: `build_exe.bat`
- Verify: `dist/ESP32C6_Servo_Studio.exe`

- [ ] **Step 1: Run build_exe.bat**
  Compile with PyInstaller.

- [ ] **Step 2: Verify binary size & launch test**
  Verify executable updated in `dist/` and launches cleanly.
