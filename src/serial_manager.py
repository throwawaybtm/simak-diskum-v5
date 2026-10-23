"""
Thread-Safe Serial Manager for ESP32-C6 Servo Studio
"""

import threading
import queue
import time
from typing import List, Tuple, Callable, Optional
import serial
import serial.tools.list_ports


class SerialManager:
    def __init__(self):
        self._serial: Optional[serial.Serial] = None
        self._conn_lock = threading.Lock()
        self._write_lock = threading.Lock()
        self._write_queue: queue.Queue = queue.Queue()
        self._stop_event = threading.Event()
        self._is_connected: bool = False
        
        self._reader_thread: Optional[threading.Thread] = None
        self._writer_thread: Optional[threading.Thread] = None
        
        self._line_callback: Optional[Callable[[str], None]] = None
        self._status_callback: Optional[Callable[[bool, str], None]] = None
        self._current_port: str = ""
        self._baudrate: int = 115200

    def set_line_callback(self, callback: Callable[[str], None]) -> None:
        """Set callback function for incoming lines: callback(line: str)"""
        self._line_callback = callback

    def set_status_callback(self, callback: Callable[[bool, str], None]) -> None:
        """Set callback function for connection status: callback(connected: bool, message: str)"""
        self._status_callback = callback

    def _notify_status(self, connected: bool, message: str) -> None:
        if self._status_callback:
            try:
                self._status_callback(connected, message)
            except Exception:
                pass

    def list_ports(self) -> List[Tuple[str, str]]:
        """
        List available serial ports on the system.
        Returns list of (device_name, description) tuples.
        """
        ports = serial.tools.list_ports.comports()
        result = []
        for p in ports:
            result.append((p.device, p.description or p.device))
        return result

    def is_connected(self) -> bool:
        """Lock-free atomic check for connection state."""
        return self._is_connected

    def connect(self, port: str, baudrate: int = 115200) -> bool:
        """Connect to the specified serial port with given baud rate."""
        self.disconnect()

        with self._conn_lock:
            try:
                self._serial = serial.Serial(
                    port=port,
                    baudrate=baudrate,
                    timeout=0.2,
                    write_timeout=1.0
                )
                self._current_port = port
                self._baudrate = baudrate
                self._stop_event.clear()
                self._is_connected = True
            except Exception as e:
                self._serial = None
                self._is_connected = False
                self._notify_status(False, f"Connection failed: {e}")
                return False

        # Clear write queue
        while not self._write_queue.empty():
            try:
                self._write_queue.get_nowait()
            except queue.Empty:
                break

        # Start reader and writer threads
        self._reader_thread = threading.Thread(target=self._read_loop, daemon=True, name="SerialReader")
        self._writer_thread = threading.Thread(target=self._write_loop, daemon=True, name="SerialWriter")
        self._reader_thread.start()
        self._writer_thread.start()

        self._notify_status(True, f"Connected to {port} @ {baudrate} baud")
        return True

    def disconnect(self) -> None:
        """Disconnect safely from the serial port and stop worker threads."""
        self._is_connected = False
        self._stop_event.set()
        
        # Put empty sentinel in queue to wake writer thread
        self._write_queue.put(None)

        with self._conn_lock:
            ser = self._serial
            self._serial = None
            if ser:
                try:
                    ser.close()
                except Exception:
                    pass

        port = self._current_port
        self._current_port = ""

        current = threading.current_thread()
        if self._reader_thread and self._reader_thread.is_alive() and self._reader_thread != current:
            self._reader_thread.join(timeout=0.3)
        if self._writer_thread and self._writer_thread.is_alive() and self._writer_thread != current:
            self._writer_thread.join(timeout=0.3)

        self._reader_thread = None
        self._writer_thread = None

        if port:
            self._notify_status(False, f"Disconnected from {port}")

    def send_command(self, command: str) -> bool:
        """Enqueue command string to be written by writer thread."""
        if not self.is_connected():
            return False
        if not command.endswith("\n"):
            command += "\n"

        cmd_bytes = command.encode("utf-8")

        # For high-frequency live move commands (M:), collapse older pending M: commands
        if command.startswith("M:"):
            with self._conn_lock:
                temp_items = []
                while not self._write_queue.empty():
                    try:
                        item = self._write_queue.get_nowait()
                        if item is not None and not item.startswith(b"M:"):
                            temp_items.append(item)
                    except queue.Empty:
                        break
                for item in temp_items:
                    self._write_queue.put(item)

        self._write_queue.put(cmd_bytes)
        return True

    def send_immediate(self, command: str) -> bool:
        """Immediately write command string bypassing queue."""
        if not self.is_connected():
            return False
        if not command.endswith("\n"):
            command += "\n"
        with self._write_lock:
            ser = self._serial
            if not ser or not ser.is_open:
                return False
            try:
                ser.write(command.encode("utf-8"))
                ser.flush()
                return True
            except Exception as e:
                self._handle_error(e)
                return False

    def _handle_error(self, err: Exception) -> None:
        """Handle communication error / unexpected disconnect."""
        port = self._current_port
        self.disconnect()
        self._notify_status(False, f"Device error on {port}: {err}")

    def _write_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                item = self._write_queue.get(timeout=0.1)
                if item is None:
                    break
                with self._write_lock:
                    ser = self._serial
                    if ser and ser.is_open:
                        ser.write(item)
                        ser.flush()
                self._write_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                self._handle_error(e)
                break

    def _read_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                ser = self._serial
                if not ser or not ser.is_open or not self._is_connected:
                    time.sleep(0.02)
                    continue

                # Duplex read without holding any global connection lock!
                raw_bytes = ser.readline()

                if raw_bytes:
                    try:
                        line = raw_bytes.decode("utf-8", errors="replace").strip()
                        if line and self._line_callback:
                            self._line_callback(line)
                    except Exception:
                        pass
                else:
                    time.sleep(0.01)
            except Exception as e:
                if not self._stop_event.is_set():
                    self._handle_error(e)
                break
