/*
 * ESP32-C6 Servo Studio Firmware
 * Target: ESP32-C6 (Arduino-ESP32 Core v3.0+)
 *
 * Requirements:
 * - Uses Core v3.0+ LEDC API: ledcAttach(pin, freq, res) and ledcWrite(pin, duty)
 * - Servo Pin: GPIO 4 (500us to 2400us pulse width at 50Hz, 14-bit resolution)
 * - Serial: 115200 baud, newline '\n' terminated
 * - Non-blocking state machines with millis() for MOVE, SWEEP, and CYCLE
 * - Speed control (ms/deg) for both live manual movement and recorded sequence steps
 * - Sequence persistence in NVS via Preferences.h (up to 30 steps)
 */

#include <Arduino.h>
#include <Preferences.h>

// Hardware Pin and PWM Configuration
static const uint8_t  SERVO_PIN         = 7;
static const uint32_t LEDC_FREQ_HZ      = 50;     // 50 Hz -> 20ms period
static const uint8_t  LEDC_RESOLUTION   = 14;     // 14-bit resolution -> 0..16383
static const uint32_t LEDC_MAX_DUTY     = (1UL << LEDC_RESOLUTION) - 1; // 16383
static const uint32_t PERIOD_US         = 20000;  // 20ms = 20000us
static const uint32_t MIN_PULSE_US      = 500;    // 0 degrees
static const uint32_t MAX_PULSE_US      = 2400;   // 180 degrees

// Limits
static const uint8_t MAX_STEPS = 30;

// Step structure for sequence recorder (with transit speed in ms/deg)
struct ServoStep {
  uint16_t angle;     // 0 - 180 degrees
  uint16_t speed_ms;  // ms per degree (0 = instant, >0 = smooth interpolation)
  uint32_t wait_ms;   // Duration to stay at this angle (dwell)
};

// Operating Modes
enum StudioMode {
  MODE_IDLE,
  MODE_MOVE,          // Smooth live manual movement
  MODE_SWEEP,         // Continuous oscillation
  MODE_CYCLE          // Looping recorded sequence
};

enum CyclePhase {
  CYCLE_PHASE_TRANSIT, // Moving to step target angle
  CYCLE_PHASE_DWELL    // Waiting at target angle
};

// State Variables
static StudioMode current_mode = MODE_IDLE;
static uint16_t current_angle  = 90;

// Live Move State
static uint16_t live_target_angle = 90;
static uint32_t live_speed_ms     = 0;
static uint32_t last_move_time    = 0;

// Sweep State
static uint16_t sweep_min_angle = 0;
static uint16_t sweep_max_angle = 180;
static uint32_t sweep_speed_ms  = 20; // ms per degree
static int8_t   sweep_dir       = 1;
static uint32_t last_sweep_time = 0;

// Cycle / Sequence State
static ServoStep sequence_steps[MAX_STEPS];
static uint8_t   sequence_count = 0;
static uint8_t   cycle_step_idx = 0;
static CyclePhase cycle_phase   = CYCLE_PHASE_TRANSIT;
static uint32_t  cycle_timer    = 0;

// NVS Preferences
static Preferences prefs;
static const char* PREFS_NAMESPACE = "servo_seq";

// Serial input buffer
static const size_t SERIAL_BUF_SIZE = 512;
static char serial_rx_buf[SERIAL_BUF_SIZE];
static size_t rx_idx = 0;

// Convert angle (0-180) to 14-bit LEDC duty cycle
static uint32_t angleToDuty(uint16_t angle) {
  if (angle > 180) angle = 180;
  uint32_t pulse_us = MIN_PULSE_US + ((uint32_t)angle * (MAX_PULSE_US - MIN_PULSE_US)) / 180UL;
  uint32_t duty = (uint32_t)(((uint64_t)pulse_us * LEDC_MAX_DUTY) / PERIOD_US);
  return duty;
}

// Set servo angle hardware output
static void applyServoAngle(uint16_t angle) {
  if (angle > 180) angle = 180;
  current_angle = angle;
  uint32_t duty = angleToDuty(current_angle);
  ledcWrite(SERVO_PIN, duty);
}

// Load saved sequence from NVS flash
static void loadSequenceFromNVS() {
  if (prefs.begin(PREFS_NAMESPACE, true)) { // Read-only mode
    uint8_t count = prefs.getUChar("count", 0);
    if (count > 0 && count <= MAX_STEPS) {
      size_t read_bytes = prefs.getBytes("steps", sequence_steps, count * sizeof(ServoStep));
      if (read_bytes == count * sizeof(ServoStep)) {
        sequence_count = count;
      } else {
        sequence_count = 0;
      }
    } else {
      sequence_count = 0;
    }
    prefs.end();
  }
}

// Save sequence to NVS flash
static bool saveSequenceToNVS() {
  if (sequence_count > MAX_STEPS) return false;
  if (!prefs.begin(PREFS_NAMESPACE, false)) { // Read-write mode
    return false;
  }
  prefs.putUChar("count", sequence_count);
  if (sequence_count > 0) {
    prefs.putBytes("steps", sequence_steps, sequence_count * sizeof(ServoStep));
  }
  prefs.end();
  return true;
}

// Parse and process complete incoming command line
static void processCommand(const char* cmd) {
  // Ignore empty lines and leading whitespace
  while (*cmd == ' ' || *cmd == '\r' || *cmd == '\t') cmd++;
  if (*cmd == '\0') return;

  // 1. Move Command: M:<angle> or M:<angle>,<speed_ms>
  if (strncmp(cmd, "M:", 2) == 0) {
    int angle = 90;
    int spd = 0;
    int parsed = sscanf(cmd + 2, "%d,%d", &angle, &spd);
    if (parsed >= 1) {
      if (angle < 0) angle = 0;
      if (angle > 180) angle = 180;
      if (spd < 0) spd = 0;

      if (spd == 0) {
        // Instant movement
        current_mode = MODE_IDLE;
        applyServoAngle((uint16_t)angle);
        Serial.printf("OK:MOVED %d\n", angle);
      } else {
        // Smooth non-blocking movement
        live_target_angle = (uint16_t)angle;
        live_speed_ms     = (uint32_t)spd;
        last_move_time    = millis();
        current_mode      = MODE_MOVE;
        Serial.printf("OK:MOVING %d,%d\n", angle, spd);
      }
      return;
    } else {
      Serial.println("ERR:INVALID_MOVE_FORMAT");
      return;
    }
  }

  // 2. Sweep Command: S:<min>,<max>,<speed_ms>
  if (strncmp(cmd, "S:", 2) == 0) {
    int min_a = 0, max_a = 180, spd = 20;
    if (sscanf(cmd + 2, "%d,%d,%d", &min_a, &max_a, &spd) == 3) {
      if (min_a < 0) min_a = 0;
      if (max_a > 180) max_a = 180;
      if (min_a >= max_a) {
        Serial.println("ERR:INVALID_SWEEP_RANGE");
        return;
      }
      if (spd < 1) spd = 1;

      sweep_min_angle = (uint16_t)min_a;
      sweep_max_angle = (uint16_t)max_a;
      sweep_speed_ms  = (uint32_t)spd;
      sweep_dir       = 1;
      current_mode    = MODE_SWEEP;
      last_sweep_time = millis();

      applyServoAngle(sweep_min_angle);
      Serial.printf("OK:SWEEP %d,%d,%d\n", sweep_min_angle, sweep_max_angle, sweep_speed_ms);
      return;
    } else {
      Serial.println("ERR:INVALID_SWEEP_FORMAT");
      return;
    }
  }

  // 3. Record Sequence: REC:<ang1>,<spd1>,<wait1>;<ang2>,<spd2>,<wait2>;...
  // Also supports 2-parameter legacy: REC:<ang1>,<wait1>;...
  if (strncmp(cmd, "REC:", 4) == 0) {
    const char* p = cmd + 4;
    uint8_t parsed_count = 0;
    ServoStep temp_steps[MAX_STEPS];

    while (*p != '\0' && parsed_count < MAX_STEPS) {
      int ang = 0, spd = 0;
      unsigned long wt = 0;
      int consumed = 0;

      // Try 3 parameters: angle, speed_ms, wait_ms
      if (sscanf(p, "%d,%d,%lu%n", &ang, &spd, &wt, &consumed) == 3 && consumed > 0) {
        if (ang < 0) ang = 0;
        if (ang > 180) ang = 180;
        if (spd < 0) spd = 0;
        temp_steps[parsed_count].angle = (uint16_t)ang;
        temp_steps[parsed_count].speed_ms = (uint16_t)spd;
        temp_steps[parsed_count].wait_ms = (uint32_t)wt;
        parsed_count++;
        p += consumed;
      }
      // Fallback 2 parameters: angle, wait_ms
      else if (sscanf(p, "%d,%lu%n", &ang, &wt, &consumed) >= 2 && consumed > 0) {
        if (ang < 0) ang = 0;
        if (ang > 180) ang = 180;
        temp_steps[parsed_count].angle = (uint16_t)ang;
        temp_steps[parsed_count].speed_ms = 0;
        temp_steps[parsed_count].wait_ms = (uint32_t)wt;
        parsed_count++;
        p += consumed;
      } else {
        break;
      }

      if (*p == ';') {
        p++; // Skip delimiter
      } else {
        break;
      }
    }

    if (parsed_count > 0) {
      sequence_count = parsed_count;
      for (uint8_t i = 0; i < sequence_count; i++) {
        sequence_steps[i] = temp_steps[i];
      }
      if (saveSequenceToNVS()) {
        Serial.printf("OK:SAVED %d\n", sequence_count);
      } else {
        Serial.println("ERR:NVS_WRITE_FAILED");
      }
      return;
    } else {
      Serial.println("ERR:NO_VALID_STEPS");
      return;
    }
  }

  // 4. Play Cycle Command: PLAY:1
  if (strncmp(cmd, "PLAY:1", 6) == 0) {
    if (sequence_count == 0) {
      Serial.println("ERR:NO_SEQUENCE_SAVED");
      return;
    }
    current_mode = MODE_CYCLE;
    cycle_step_idx = 0;
    cycle_phase = CYCLE_PHASE_TRANSIT;
    cycle_timer = millis();

    // If step 0 has 0 speed, snap immediately
    if (sequence_steps[0].speed_ms == 0) {
      applyServoAngle(sequence_steps[0].angle);
      cycle_phase = CYCLE_PHASE_DWELL;
      cycle_timer = millis();
    }
    Serial.printf("OK:CYCLE_STARTED %d\n", sequence_count);
    return;
  }

  // 5. Stop Command: STOP:1
  if (strncmp(cmd, "STOP:1", 6) == 0) {
    current_mode = MODE_IDLE;
    Serial.println("OK:STOPPED");
    return;
  }

  // 6. Query status
  if (strncmp(cmd, "STATUS?", 7) == 0) {
    Serial.printf("STATUS:MODE=%d,ANGLE=%d,STEPS=%d\n", (int)current_mode, current_angle, sequence_count);
    return;
  }

  Serial.println("ERR:UNKNOWN_COMMAND");
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // ESP32 Arduino Core v3.0+ API: ledcAttach(pin, freq, resolution)
  ledcAttach(SERVO_PIN, LEDC_FREQ_HZ, LEDC_RESOLUTION);

  // Initial center position (90 degrees)
  applyServoAngle(90);

  // Restore saved routine from NVS
  loadSequenceFromNVS();

  Serial.println("ESP32C6_SERVO_STUDIO_READY");
}

void loop() {
  // Non-blocking Serial Line Receiver
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (rx_idx > 0) {
        serial_rx_buf[rx_idx] = '\0';
        processCommand(serial_rx_buf);
        rx_idx = 0;
      }
    } else {
      if (rx_idx < (SERIAL_BUF_SIZE - 1)) {
        serial_rx_buf[rx_idx++] = c;
      } else {
        rx_idx = 0; // Buffer overflow protection
      }
    }
  }

  uint32_t now = millis();

  // 1. Non-blocking Smooth Live Move State Machine
  if (current_mode == MODE_MOVE) {
    if (current_angle == live_target_angle) {
      current_mode = MODE_IDLE;
    } else if (now - last_move_time >= live_speed_ms) {
      last_move_time = now;
      if (current_angle < live_target_angle) {
        applyServoAngle(current_angle + 1);
      } else if (current_angle > live_target_angle) {
        applyServoAngle(current_angle - 1);
      }
      if (current_angle == live_target_angle) {
        current_mode = MODE_IDLE;
      }
    }
  }
  // 2. Non-blocking Sweep State Machine
  else if (current_mode == MODE_SWEEP) {
    if (now - last_sweep_time >= sweep_speed_ms) {
      last_sweep_time = now;
      int next_angle = (int)current_angle + sweep_dir;
      if (next_angle >= (int)sweep_max_angle) {
        next_angle = sweep_max_angle;
        sweep_dir = -1;
      } else if (next_angle <= (int)sweep_min_angle) {
        next_angle = sweep_min_angle;
        sweep_dir = 1;
      }
      applyServoAngle((uint16_t)next_angle);
    }
  }
  // 3. Non-blocking Cycle State Machine (Transit + Dwell)
  else if (current_mode == MODE_CYCLE) {
    if (sequence_count > 0) {
      ServoStep* step = &sequence_steps[cycle_step_idx];

      if (cycle_phase == CYCLE_PHASE_TRANSIT) {
        if (step->speed_ms == 0 || current_angle == step->angle) {
          applyServoAngle(step->angle);
          cycle_phase = CYCLE_PHASE_DWELL;
          cycle_timer = now;
        } else if (now - cycle_timer >= step->speed_ms) {
          cycle_timer = now;
          if (current_angle < step->angle) {
            applyServoAngle(current_angle + 1);
          } else if (current_angle > step->angle) {
            applyServoAngle(current_angle - 1);
          }
          if (current_angle == step->angle) {
            cycle_phase = CYCLE_PHASE_DWELL;
            cycle_timer = now;
          }
        }
      } else if (cycle_phase == CYCLE_PHASE_DWELL) {
        if (now - cycle_timer >= step->wait_ms) {
          // Advance to next step
          cycle_step_idx = (cycle_step_idx + 1) % sequence_count;
          cycle_phase = CYCLE_PHASE_TRANSIT;
          cycle_timer = now;
        }
      }
    }
  }
}
