"""
ESP32-C6 Servo Control & Sequence Recorder Studio
Main Entry Point
"""

import sys
import os

# Add root directory to sys.path so bundled PyInstaller single-file exe resolves correctly
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.serial_manager import SerialManager
from src.sequence_model import SequenceModel
from src.gui import ServoStudioApp


def main():
    serial_mgr = SerialManager()
    seq_model = SequenceModel()
    app = ServoStudioApp(serial_mgr=serial_mgr, seq_model=seq_model)
    
    # Handle clean window close
    def on_closing():
        if serial_mgr.is_connected():
            serial_mgr.disconnect()
        app.destroy()

    app.protocol("WM_DELETE_WINDOW", on_closing)
    app.mainloop()


if __name__ == "__main__":
    main()
