import unittest
import time
from unittest.mock import MagicMock, patch

class TestGuiSmoke(unittest.TestCase):
    def test_import_gui(self):
        # Verify GUI classes and main module can be imported
        from src.gui import ServoStudioApp
        self.assertIsNotNone(ServoStudioApp)

    def test_slider_throttle_logic(self):
        from src.gui import SliderThrottler
        
        sent_commands = []
        throttler = SliderThrottler(interval_ms=30, send_func=lambda angle: sent_commands.append(angle))

        # Push multiple angle updates in rapid succession
        throttler.on_angle_change(10)
        throttler.on_angle_change(20)
        throttler.on_angle_change(30)
        
        # Immediately, first one was sent
        self.assertGreaterEqual(len(sent_commands), 1)
        self.assertEqual(sent_commands[0], 10)

        # Wait for throttle window (50ms) to allow pending target to dispatch
        time.sleep(0.06)
        throttler.flush()
        
        # The latest angle (30) should be dispatched
        self.assertEqual(sent_commands[-1], 30)

    def test_console_formatter(self):
        from src.gui import format_console_message
        tx_msg = format_console_message("M:90", is_tx=True)
        rx_msg = format_console_message("OK:MOVED 90", is_tx=False)
        self.assertTrue(tx_msg.startswith("→"))
        self.assertIn("M:90", tx_msg)
        self.assertTrue(rx_msg.startswith("←"))
        self.assertIn("OK:MOVED 90", rx_msg)

if __name__ == "__main__":
    unittest.main()
