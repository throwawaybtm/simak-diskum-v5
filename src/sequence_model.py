"""
Sequence Model and Presets for ESP32-C6 Servo Studio
"""

import json
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class ServoStep:
    angle: int       # 0 - 180 degrees
    wait_ms: int     # >= 0 ms


class SequenceModel:
    MAX_STEPS = 30

    def __init__(self):
        self._steps: List[ServoStep] = []

    def get_steps(self) -> List[ServoStep]:
        return list(self._steps)

    def count(self) -> int:
        return len(self._steps)

    def add_step(self, angle: int, wait_ms: int) -> bool:
        """Add a step with boundary checks. Max 30 steps."""
        if len(self._steps) >= self.MAX_STEPS:
            return False
        if not (0 <= angle <= 180):
            return False
        if wait_ms < 0:
            return False

        self._steps.append(ServoStep(angle=int(angle), wait_ms=int(wait_ms)))
        return True

    def delete_step(self, index: int) -> bool:
        """Delete step at index."""
        if 0 <= index < len(self._steps):
            self._steps.pop(index)
            return True
        return False

    def clear(self) -> None:
        """Clear all steps."""
        self._steps.clear()

    def to_protocol_string(self) -> str:
        """Format steps as REC:<angle1>,<wait1>;<angle2>,<wait2>;..."""
        if not self._steps:
            return ""
        step_strs = [f"{s.angle},{s.wait_ms}" for s in self._steps]
        return "REC:" + ";".join(step_strs)

    def save_to_json(self, filepath: str) -> None:
        """Save current sequence to JSON file."""
        data = {
            "version": 1,
            "target": "ESP32-C6",
            "steps": [asdict(s) for s in self._steps]
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def load_from_json(self, filepath: str) -> None:
        """Load sequence from JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        raw_steps = data.get("steps", [])
        self.clear()
        for s in raw_steps:
            angle = s.get("angle", 0)
            wait_ms = s.get("wait_ms", 500)
            if not self.add_step(angle, wait_ms):
                break
