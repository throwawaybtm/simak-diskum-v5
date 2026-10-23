import unittest
import time
from unittest.mock import MagicMock, patch
import queue

class TestSerialManager(unittest.TestCase):
    def setUp(self):
        # We will import SerialManager from src.serial_manager
        from src.serial_manager import SerialManager
        self.manager = SerialManager()

    def tearDown(self):
        if self.manager.is_connected():
            self.manager.disconnect()

    def test_list_ports(self):
        ports = self.manager.list_ports()
        self.assertIsInstance(ports, list)

    @patch("serial.Serial")
    def test_connect_and_disconnect(self, mock_serial_cls):
        mock_ser = MagicMock()
        mock_ser.is_open = True
        mock_serial_cls.return_value = mock_ser

        status_events = []
        self.manager.set_status_callback(lambda conn, msg: status_events.append((conn, msg)))

        connected = self.manager.connect("COM3", 115200)
        self.assertTrue(connected)
        self.assertTrue(self.manager.is_connected())
        self.assertTrue(any(e[0] is True for e in status_events))

        self.manager.disconnect()
        self.assertFalse(self.manager.is_connected())
        self.assertTrue(any(e[0] is False for e in status_events))

    @patch("serial.Serial")
    def test_send_command_adds_newline(self, mock_serial_cls):
        mock_ser = MagicMock()
        mock_ser.is_open = True
        mock_serial_cls.return_value = mock_ser

        self.manager.connect("COM3", 115200)
        self.manager.send_command("M:90")
        
        # Give writer thread a moment to process the queue
        time.sleep(0.1)
        mock_ser.write.assert_called_with(b"M:90\n")

    @patch("serial.Serial")
    def test_incoming_line_callback(self, mock_serial_cls):
        mock_ser = MagicMock()
        mock_ser.is_open = True
        # Simulate serial.readline returning a response line then blocking
        mock_ser.readline.side_effect = [b"OK:MOVED 90\r\n", b""]
        mock_serial_cls.return_value = mock_ser

        received = []
        self.manager.set_line_callback(lambda line: received.append(line))

        self.manager.connect("COM3", 115200)
        time.sleep(0.15)
        
        self.assertIn("OK:MOVED 90", received)

    @patch("serial.Serial")
    def test_send_immediate(self, mock_serial_cls):
        mock_ser = MagicMock()
        mock_ser.is_open = True
        mock_serial_cls.return_value = mock_ser

        self.manager.connect("COM3", 115200)
        res = self.manager.send_immediate("STOP:1")
        self.assertTrue(res)
        mock_ser.write.assert_called_with(b"STOP:1\n")

    @patch("serial.Serial")
    def test_concurrent_read_does_not_block_is_connected(self, mock_serial_cls):
        mock_ser = MagicMock()
        mock_ser.is_open = True

        # Simulate blocking readline (blocking for 0.2s)
        def blocking_readline():
            time.sleep(0.2)
            return b""
        mock_ser.readline = blocking_readline
        mock_serial_cls.return_value = mock_ser

        self.manager.connect("COM3", 115200)
        time.sleep(0.05)  # Let reader thread enter blocking readline()

        # is_connected() should be instantaneous (< 0.05s) even while readline is blocking
        t0 = time.time()
        for _ in range(5):
            conn = self.manager.is_connected()
            self.assertTrue(conn)
        elapsed = time.time() - t0
        self.assertLess(elapsed, 0.05, f"is_connected() blocked on readline lock: {elapsed:.3f}s")

if __name__ == "__main__":
    unittest.main()
