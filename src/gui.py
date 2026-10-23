"""
Modern CustomTkinter GUI for ESP32-C6 Servo Studio
"""

import time
import threading
from typing import Optional, Callable
import tkinter as tk
from tkinter import filedialog, messagebox
import customtkinter as ctk

from src.serial_manager import SerialManager
from src.sequence_model import SequenceModel, ServoStep


def format_console_message(text: str, is_tx: bool) -> str:
    """Format console log lines with direction arrows."""
    arrow = "→" if is_tx else "←"
    timestamp = time.strftime("%H:%M:%S")
    return f"{arrow} [{timestamp}] {text}"


def format_move_command(angle: int, speed_ms: int = 0) -> str:
    """Format M:<angle>,<speed_ms> command string."""
    return f"M:{int(angle)},{int(speed_ms)}"


class SliderThrottler:
    """Throttles high-frequency slider moves to avoid flooding serial bus."""
    def __init__(self, interval_ms: int = 30, send_func: Optional[Callable[[int], None]] = None):
        self.interval_sec = interval_ms / 1000.0
        self.send_func = send_func
        self._last_sent_time: float = 0.0
        self._pending_angle: Optional[int] = None
        self._lock = threading.Lock()
        self._timer: Optional[threading.Timer] = None

    def on_angle_change(self, angle: int) -> None:
        with self._lock:
            now = time.time()
            if (now - self._last_sent_time) >= self.interval_sec:
                self._last_sent_time = now
                self._pending_angle = None
                if self.send_func:
                    self.send_func(angle)
            else:
                self._pending_angle = angle
                if self._timer is None or not self._timer.is_alive():
                    delay = max(0.001, self.interval_sec - (now - self._last_sent_time))
                    self._timer = threading.Timer(delay, self._dispatch_pending)
                    self._timer.daemon = True
                    self._timer.start()

    def _dispatch_pending(self) -> None:
        with self._lock:
            if self._pending_angle is not None:
                self._last_sent_time = time.time()
                angle = self._pending_angle
                self._pending_angle = None
                if self.send_func:
                    self.send_func(angle)

    def flush(self) -> None:
        """Immediately dispatch any pending angle change."""
        self._dispatch_pending()


class ServoStudioApp(ctk.CTk):
    def __init__(self, serial_mgr: Optional[SerialManager] = None, seq_model: Optional[SequenceModel] = None):
        super().__init__()

        self.title("ESP32-C6 Servo Studio")
        self.geometry("1020x820")
        self.minsize(880, 700)

        ctk.set_appearance_mode("Dark")
        ctk.set_default_color_theme("blue")

        self.serial_mgr = serial_mgr if serial_mgr is not None else SerialManager()
        self.seq_model = seq_model if seq_model is not None else SequenceModel()

        # Wire serial callbacks
        self.serial_mgr.set_line_callback(self._on_serial_line_received)
        self.serial_mgr.set_status_callback(self._on_serial_status_changed)

        # Throttler for manual live slider
        self.slider_throttler = SliderThrottler(
            interval_ms=30,
            send_func=self._send_manual_angle
        )

        self._build_ui()
        self._refresh_com_ports()

    def _build_ui(self) -> None:
        # Main grid config
        self.grid_rowconfigure(0, weight=0)  # Top bar
        self.grid_rowconfigure(1, weight=1)  # Central panels
        self.grid_rowconfigure(2, weight=0)  # Console log
        self.grid_columnconfigure(0, weight=1)

        self._build_top_bar()
        self._build_central_panels()
        self._build_bottom_bar()

    # -------------------------------------------------------------
    # 1. TOP BAR
    # -------------------------------------------------------------
    def _build_top_bar(self) -> None:
        top_frame = ctk.CTkFrame(self, corner_radius=8)
        top_frame.grid(row=0, column=0, padx=12, pady=(12, 6), sticky="ew")

        # Title Label
        title_lbl = ctk.CTkLabel(top_frame, text="ESP32-C6 Servo Studio", font=ctk.CTkFont(size=18, weight="bold"))
        title_lbl.pack(side="left", padx=14, pady=10)

        # Port Dropdown
        self.port_combobox = ctk.CTkComboBox(top_frame, values=["Scanning..."], width=160)
        self.port_combobox.pack(side="left", padx=6, pady=10)

        # Refresh Ports Button
        self.refresh_btn = ctk.CTkButton(top_frame, text="Refresh Ports", width=100, command=self._refresh_com_ports)
        self.refresh_btn.pack(side="left", padx=6, pady=10)

        # Baud Rate Label
        baud_lbl = ctk.CTkLabel(top_frame, text="115200 Baud", font=ctk.CTkFont(size=12))
        baud_lbl.pack(side="left", padx=10, pady=10)

        # Status Indicator Badge
        self.status_badge = ctk.CTkLabel(
            top_frame,
            text="Disconnected",
            fg_color="#D32F2F",
            text_color="white",
            corner_radius=6,
            padx=12,
            pady=4,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        self.status_badge.pack(side="right", padx=14, pady=10)

        # Connect / Disconnect Toggle Button
        self.connect_btn = ctk.CTkButton(
            top_frame,
            text="Connect",
            width=110,
            command=self._toggle_connection,
            fg_color="#1976D2",
            hover_color="#1565C0"
        )
        self.connect_btn.pack(side="right", padx=6, pady=10)

    # -------------------------------------------------------------
    # 2. CENTRAL PANELS (Left: Live/Sweep, Right: Sequencer)
    # -------------------------------------------------------------
    def _build_central_panels(self) -> None:
        center_frame = ctk.CTkFrame(self, corner_radius=8, fg_color="transparent")
        center_frame.grid(row=1, column=0, padx=12, pady=6, sticky="nsew")
        center_frame.grid_columnconfigure(0, weight=1)
        center_frame.grid_columnconfigure(1, weight=1)
        center_frame.grid_rowconfigure(0, weight=1)

        self._build_left_panel(center_frame)
        self._build_right_panel(center_frame)

    # LEFT PANEL: Live Manual & Sweep Control
    def _build_left_panel(self, parent: ctk.CTkFrame) -> None:
        left_frame = ctk.CTkFrame(parent, corner_radius=8)
        left_frame.grid(row=0, column=0, padx=(0, 6), pady=0, sticky="nsew")

        # Header
        header = ctk.CTkLabel(left_frame, text="Live Control & Sweep", font=ctk.CTkFont(size=15, weight="bold"))
        header.pack(anchor="w", padx=14, pady=(12, 6))

        # --- Manual Angle Slider & Live Speed Control ---
        slider_box = ctk.CTkFrame(left_frame, fg_color="#1E1E1E", corner_radius=6)
        slider_box.pack(fill="x", padx=12, pady=6)

        slider_top = ctk.CTkFrame(slider_box, fg_color="transparent")
        slider_top.pack(fill="x", padx=10, pady=(8, 2))
        ctk.CTkLabel(slider_top, text="Manual Live Angle (0° - 180°)", font=ctk.CTkFont(weight="bold")).pack(side="left")
        self.angle_display = ctk.CTkLabel(slider_top, text="90°", font=ctk.CTkFont(size=16, weight="bold"), text_color="#64B5F6")
        self.angle_display.pack(side="right")

        self.angle_slider = ctk.CTkSlider(
            slider_box,
            from_=0,
            to=180,
            number_of_steps=180,
            command=self._on_slider_moved
        )
        self.angle_slider.set(90)
        self.angle_slider.pack(fill="x", padx=10, pady=(2, 6))

        # Quick angle buttons (0°, 45°, 90°, 135°, 180°)
        quick_btns_box = ctk.CTkFrame(slider_box, fg_color="transparent")
        quick_btns_box.pack(fill="x", padx=10, pady=(0, 8))
        for deg in [0, 45, 90, 135, 180]:
            btn = ctk.CTkButton(
                quick_btns_box,
                text=f"{deg}°",
                width=45,
                height=26,
                command=lambda d=deg: self._set_angle_direct(d)
            )
            btn.pack(side="left", expand=True, padx=2)

        # --- Live Speed Control ---
        speed_top = ctk.CTkFrame(slider_box, fg_color="transparent")
        speed_top.pack(fill="x", padx=10, pady=(6, 2))
        ctk.CTkLabel(speed_top, text="Live Move Speed (ms/deg):").pack(side="left")
        self.live_speed_lbl = ctk.CTkLabel(speed_top, text="Instant (0 ms)", font=ctk.CTkFont(weight="bold"), text_color="#81C784")
        self.live_speed_lbl.pack(side="right")

        self.live_speed_slider = ctk.CTkSlider(
            slider_box,
            from_=0,
            to=100,
            number_of_steps=100,
            command=self._on_live_speed_changed
        )
        self.live_speed_slider.set(0)
        self.live_speed_slider.pack(fill="x", padx=10, pady=(2, 6))

        # Quick speed presets (0 = Instant, 10 = Fast, 25 = Med, 50 = Slow)
        quick_spd_box = ctk.CTkFrame(slider_box, fg_color="transparent")
        quick_spd_box.pack(fill="x", padx=10, pady=(0, 10))
        for spd_label, spd_val in [("Instant", 0), ("Fast (10ms)", 10), ("Med (25ms)", 25), ("Slow (50ms)", 50)]:
            btn = ctk.CTkButton(
                quick_spd_box,
                text=spd_label,
                height=24,
                command=lambda v=spd_val: self._set_live_speed_direct(v)
            )
            btn.pack(side="left", expand=True, padx=2)

        # --- Sweep Generator ---
        sweep_box = ctk.CTkFrame(left_frame, fg_color="#1E1E1E", corner_radius=6)
        sweep_box.pack(fill="both", expand=True, padx=12, pady=6)

        ctk.CTkLabel(sweep_box, text="Automatic Sweep Generator", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=10, pady=(10, 4))

        # Min Angle
        min_f = ctk.CTkFrame(sweep_box, fg_color="transparent")
        min_f.pack(fill="x", padx=10, pady=4)
        ctk.CTkLabel(min_f, text="Min Angle:", width=90, anchor="w").pack(side="left")
        self.sweep_min_slider = ctk.CTkSlider(min_f, from_=0, to=180, number_of_steps=180, command=self._update_sweep_labels)
        self.sweep_min_slider.set(0)
        self.sweep_min_slider.pack(side="left", fill="x", expand=True, padx=6)
        self.sweep_min_lbl = ctk.CTkLabel(min_f, text="0°", width=40)
        self.sweep_min_lbl.pack(side="right")

        # Max Angle
        max_f = ctk.CTkFrame(sweep_box, fg_color="transparent")
        max_f.pack(fill="x", padx=10, pady=4)
        ctk.CTkLabel(max_f, text="Max Angle:", width=90, anchor="w").pack(side="left")
        self.sweep_max_slider = ctk.CTkSlider(max_f, from_=0, to=180, number_of_steps=180, command=self._update_sweep_labels)
        self.sweep_max_slider.set(180)
        self.sweep_max_slider.pack(side="left", fill="x", expand=True, padx=6)
        self.sweep_max_lbl = ctk.CTkLabel(max_f, text="180°", width=40)
        self.sweep_max_lbl.pack(side="right")

        # Speed (ms per deg)
        spd_f = ctk.CTkFrame(sweep_box, fg_color="transparent")
        spd_f.pack(fill="x", padx=10, pady=4)
        ctk.CTkLabel(spd_f, text="Speed (ms/deg):", width=90, anchor="w").pack(side="left")
        self.sweep_spd_slider = ctk.CTkSlider(spd_f, from_=5, to=100, number_of_steps=95, command=self._update_sweep_labels)
        self.sweep_spd_slider.set(20)
        self.sweep_spd_slider.pack(side="left", fill="x", expand=True, padx=6)
        self.sweep_spd_lbl = ctk.CTkLabel(spd_f, text="20 ms", width=40)
        self.sweep_spd_lbl.pack(side="right")

        # Sweep Action Buttons
        sweep_btn_box = ctk.CTkFrame(sweep_box, fg_color="transparent")
        sweep_btn_box.pack(fill="x", padx=10, pady=(10, 10))
        self.start_sweep_btn = ctk.CTkButton(
            sweep_btn_box,
            text="Start Sweep",
            command=self._start_sweep,
            fg_color="#388E3C",
            hover_color="#2E7D32"
        )
        self.start_sweep_btn.pack(side="left", expand=True, padx=(0, 4))

        self.stop_sweep_btn = ctk.CTkButton(
            sweep_btn_box,
            text="Stop Motion",
            command=self._stop_motion,
            fg_color="#D32F2F",
            hover_color="#C62828"
        )
        self.stop_sweep_btn.pack(side="right", expand=True, padx=(4, 0))

    # RIGHT PANEL: Movement Sequence Recorder & Macro Builder
    def _build_right_panel(self, parent: ctk.CTkFrame) -> None:
        right_frame = ctk.CTkFrame(parent, corner_radius=8)
        right_frame.grid(row=0, column=1, padx=(6, 0), pady=0, sticky="nsew")

        # Header
        header = ctk.CTkLabel(right_frame, text="Sequence Recorder & Macro Builder", font=ctk.CTkFont(size=15, weight="bold"))
        header.pack(anchor="w", padx=14, pady=(12, 6))

        # --- Capture & Add Step Controls ---
        step_input_box = ctk.CTkFrame(right_frame, fg_color="#1E1E1E", corner_radius=6)
        step_input_box.pack(fill="x", padx=12, pady=6)

        # Row 1: Capture live angle with speed and wait
        capture_row = ctk.CTkFrame(step_input_box, fg_color="transparent")
        capture_row.pack(fill="x", padx=10, pady=(8, 4))
        
        self.capture_btn = ctk.CTkButton(
            capture_row,
            text="Capture Live Angle as Step",
            command=self._capture_current_angle,
            fg_color="#0288D1",
            hover_color="#0277BD"
        )
        self.capture_btn.pack(side="left", expand=True, fill="x", padx=(0, 6))

        ctk.CTkLabel(capture_row, text="Spd:").pack(side="left", padx=(2, 2))
        self.step_speed_entry = ctk.CTkEntry(capture_row, width=48)
        self.step_speed_entry.insert(0, "20")
        self.step_speed_entry.pack(side="left")
        ctk.CTkLabel(capture_row, text="ms").pack(side="left", padx=(2, 4))

        ctk.CTkLabel(capture_row, text="Wait:").pack(side="left", padx=(2, 2))
        self.step_wait_entry = ctk.CTkEntry(capture_row, width=54)
        self.step_wait_entry.insert(0, "500")
        self.step_wait_entry.pack(side="left")
        ctk.CTkLabel(capture_row, text="ms").pack(side="left", padx=(2, 0))

        # Row 2: Custom Step Row (Angle, Speed, Wait)
        custom_row = ctk.CTkFrame(step_input_box, fg_color="transparent")
        custom_row.pack(fill="x", padx=10, pady=(4, 8))
        
        ctk.CTkLabel(custom_row, text="Custom:").pack(side="left", padx=(0, 2))
        self.custom_angle_entry = ctk.CTkEntry(custom_row, width=45)
        self.custom_angle_entry.insert(0, "90")
        self.custom_angle_entry.pack(side="left", padx=2)
        ctk.CTkLabel(custom_row, text="°").pack(side="left", padx=(0, 4))

        ctk.CTkLabel(custom_row, text="Spd:").pack(side="left", padx=(2, 2))
        self.custom_speed_entry = ctk.CTkEntry(custom_row, width=45)
        self.custom_speed_entry.insert(0, "20")
        self.custom_speed_entry.pack(side="left", padx=2)
        ctk.CTkLabel(custom_row, text="ms").pack(side="left", padx=(0, 4))

        ctk.CTkLabel(custom_row, text="Wait:").pack(side="left", padx=(2, 2))
        self.custom_wait_entry = ctk.CTkEntry(custom_row, width=52)
        self.custom_wait_entry.insert(0, "500")
        self.custom_wait_entry.pack(side="left", padx=2)
        ctk.CTkLabel(custom_row, text="ms").pack(side="left", padx=(0, 6))

        self.add_custom_btn = ctk.CTkButton(custom_row, text="Add Step", width=70, command=self._add_custom_step)
        self.add_custom_btn.pack(side="right")

        # --- Recorded Steps Table / List ---
        list_header = ctk.CTkFrame(right_frame, fg_color="transparent")
        list_header.pack(fill="x", padx=12, pady=(4, 0))
        self.seq_count_lbl = ctk.CTkLabel(list_header, text="Steps: 0 / 30", font=ctk.CTkFont(size=12, weight="bold"))
        self.seq_count_lbl.pack(side="left")

        self.clear_all_btn = ctk.CTkButton(
            list_header,
            text="Clear All",
            width=65,
            height=24,
            fg_color="#616161",
            hover_color="#424242",
            command=self._clear_all_steps
        )
        self.clear_all_btn.pack(side="right")

        self.steps_scroll = ctk.CTkScrollableFrame(right_frame, fg_color="#1E1E1E", corner_radius=6, height=160)
        self.steps_scroll.pack(fill="both", expand=True, padx=12, pady=4)

        # --- Macro Execution Controls ---
        action_box = ctk.CTkFrame(right_frame, fg_color="transparent")
        action_box.pack(fill="x", padx=12, pady=4)

        self.upload_btn = ctk.CTkButton(
            action_box,
            text="Upload to ESP32 (REC)",
            command=self._upload_sequence,
            fg_color="#F57C00",
            hover_color="#EF6C00"
        )
        self.upload_btn.pack(side="left", expand=True, fill="x", padx=(0, 4))

        self.play_btn = ctk.CTkButton(
            action_box,
            text="Run Cycle (PLAY)",
            command=self._play_cycle,
            fg_color="#388E3C",
            hover_color="#2E7D32"
        )
        self.play_btn.pack(side="left", expand=True, fill="x", padx=4)

        self.stop_cycle_btn = ctk.CTkButton(
            action_box,
            text="Stop (STOP)",
            command=self._stop_motion,
            fg_color="#D32F2F",
            hover_color="#C62828"
        )
        self.stop_cycle_btn.pack(side="right", expand=True, fill="x", padx=(4, 0))

        # --- Preset Storage (JSON) ---
        preset_box = ctk.CTkFrame(right_frame, fg_color="transparent")
        preset_box.pack(fill="x", padx=12, pady=(4, 10))

        self.save_preset_btn = ctk.CTkButton(
            preset_box,
            text="Save Preset (.json)",
            command=self._save_preset,
            fg_color="#455A64",
            hover_color="#37474F"
        )
        self.save_preset_btn.pack(side="left", expand=True, fill="x", padx=(0, 4))

        self.load_preset_btn = ctk.CTkButton(
            preset_box,
            text="Load Preset (.json)",
            command=self._load_preset,
            fg_color="#455A64",
            hover_color="#37474F"
        )
        self.load_preset_btn.pack(side="right", expand=True, fill="x", padx=(4, 0))

        self._render_step_list()

    # -------------------------------------------------------------
    # 3. BOTTOM BAR (Console Log)
    # -------------------------------------------------------------
    def _build_bottom_bar(self) -> None:
        bottom_frame = ctk.CTkFrame(self, corner_radius=8)
        bottom_frame.grid(row=2, column=0, padx=12, pady=(6, 12), sticky="ew")

        header_row = ctk.CTkFrame(bottom_frame, fg_color="transparent")
        header_row.pack(fill="x", padx=10, pady=(6, 2))

        ctk.CTkLabel(header_row, text="Serial Console Activity", font=ctk.CTkFont(size=12, weight="bold")).pack(side="left")

        clear_btn = ctk.CTkButton(
            header_row,
            text="Clear Log",
            width=65,
            height=22,
            fg_color="#424242",
            hover_color="#616161",
            command=self._clear_console
        )
        clear_btn.pack(side="right")

        self.console_textbox = ctk.CTkTextbox(bottom_frame, height=130, font=ctk.CTkFont(family="Consolas", size=11))
        self.console_textbox.pack(fill="both", expand=True, padx=10, pady=(2, 8))
        self.console_textbox.configure(state="disabled")

    # -------------------------------------------------------------
    # LOGIC: SERIAL & APP ACTIONS
    # -------------------------------------------------------------
    def log_message(self, message: str, is_tx: bool = False) -> None:
        """Thread-safe append formatted message to console."""
        formatted = format_console_message(message, is_tx=is_tx)
        self.after(0, self._append_to_console, formatted)

    def _append_to_console(self, text: str) -> None:
        self.console_textbox.configure(state="normal")
        self.console_textbox.insert("end", text + "\n")
        self.console_textbox.see("end")
        self.console_textbox.configure(state="disabled")

    def _clear_console(self) -> None:
        self.console_textbox.configure(state="normal")
        self.console_textbox.delete("1.0", "end")
        self.console_textbox.configure(state="disabled")

    def _refresh_com_ports(self) -> None:
        ports = self.serial_mgr.list_ports()
        if ports:
            port_strings = [f"{dev} ({desc})" for dev, desc in ports]
            self.port_combobox.configure(values=port_strings)
            self.port_combobox.set(port_strings[0])
        else:
            self.port_combobox.configure(values=["No COM Ports Found"])
            self.port_combobox.set("No COM Ports Found")

    def _toggle_connection(self) -> None:
        if self.serial_mgr.is_connected():
            self.serial_mgr.disconnect()
        else:
            selected = self.port_combobox.get()
            if not selected or "No COM Ports" in selected:
                messagebox.showwarning("Port Error", "Please select a valid COM port.")
                return
            port_name = selected.split(" ")[0]
            self.serial_mgr.connect(port_name, 115200)

    def _on_serial_status_changed(self, connected: bool, message: str) -> None:
        self.after(0, self._update_connection_ui, connected, message)

    def _update_connection_ui(self, connected: bool, message: str) -> None:
        self.log_message(message, is_tx=False)
        if connected:
            self.status_badge.configure(text="Connected", fg_color="#388E3C")
            self.connect_btn.configure(text="Disconnect", fg_color="#D32F2F", hover_color="#C62828")
        else:
            self.status_badge.configure(text="Disconnected", fg_color="#D32F2F")
            self.connect_btn.configure(text="Connect", fg_color="#1976D2", hover_color="#1565C0")

    def _on_serial_line_received(self, line: str) -> None:
        self.after(0, self.log_message, line, False)

    # Manual Live Angle & Speed
    def _on_slider_moved(self, value: float) -> None:
        angle = int(round(value))
        self.angle_display.configure(text=f"{angle}°")
        self.slider_throttler.on_angle_change(angle)

    def _on_live_speed_changed(self, value: float) -> None:
        spd = int(round(value))
        if spd == 0:
            self.live_speed_lbl.configure(text="Instant (0 ms)", text_color="#81C784")
        else:
            self.live_speed_lbl.configure(text=f"{spd} ms/deg", text_color="#64B5F6")

    def _set_live_speed_direct(self, speed_ms: int) -> None:
        self.live_speed_slider.set(speed_ms)
        self._on_live_speed_changed(speed_ms)

    def _set_angle_direct(self, angle: int) -> None:
        self.angle_slider.set(angle)
        self.angle_display.configure(text=f"{angle}°")
        self._send_manual_angle(angle)

    def _send_manual_angle(self, angle: int) -> None:
        spd = int(round(self.live_speed_slider.get()))
        cmd = format_move_command(angle, spd)
        if self.serial_mgr.is_connected():
            self.serial_mgr.send_command(cmd)
            self.log_message(cmd, is_tx=True)

    # Sweep Controls
    def _update_sweep_labels(self, _=None) -> None:
        min_v = int(round(self.sweep_min_slider.get()))
        max_v = int(round(self.sweep_max_slider.get()))
        spd_v = int(round(self.sweep_spd_slider.get()))
        self.sweep_min_lbl.configure(text=f"{min_v}°")
        self.sweep_max_lbl.configure(text=f"{max_v}°")
        self.sweep_spd_lbl.configure(text=f"{spd_v} ms")

    def _start_sweep(self) -> None:
        min_v = int(round(self.sweep_min_slider.get()))
        max_v = int(round(self.sweep_max_slider.get()))
        spd_v = int(round(self.sweep_spd_slider.get()))

        if min_v >= max_v:
            messagebox.showerror("Invalid Range", "Min Angle must be strictly less than Max Angle.")
            return

        cmd = f"S:{min_v},{max_v},{spd_v}"
        if self.serial_mgr.is_connected():
            self.serial_mgr.send_command(cmd)
            self.log_message(cmd, is_tx=True)
        else:
            messagebox.showwarning("Not Connected", "Please connect to ESP32-C6 first.")

    def _stop_motion(self) -> None:
        cmd = "STOP:1"
        if self.serial_mgr.is_connected():
            self.serial_mgr.send_immediate(cmd)
            self.log_message(cmd, is_tx=True)
        else:
            self.log_message(cmd + " (offline)", is_tx=True)

    # Sequence Recorder & Macro Builder
    def _capture_current_angle(self) -> None:
        angle = int(round(self.angle_slider.get()))
        try:
            speed_ms = int(self.step_speed_entry.get().strip())
        except ValueError:
            speed_ms = 20

        try:
            wait_ms = int(self.step_wait_entry.get().strip())
        except ValueError:
            wait_ms = 500

        if not self.seq_model.add_step(angle=angle, speed_ms=speed_ms, wait_ms=wait_ms):
            messagebox.showwarning("Limit Reached", "Cannot add step. Maximum 30 steps reached or invalid values.")
            return

        self._render_step_list()

    def _add_custom_step(self) -> None:
        try:
            angle = int(self.custom_angle_entry.get().strip())
            speed_ms = int(self.custom_speed_entry.get().strip())
            wait_ms = int(self.custom_wait_entry.get().strip())
        except ValueError:
            messagebox.showerror("Input Error", "Please enter valid integers for Angle, Speed, and Wait Duration.")
            return

        if not (0 <= angle <= 180):
            messagebox.showerror("Angle Error", "Angle must be between 0 and 180 degrees.")
            return
        if speed_ms < 0:
            messagebox.showerror("Speed Error", "Speed must be 0 ms/deg or greater.")
            return
        if wait_ms < 0:
            messagebox.showerror("Wait Error", "Wait duration must be 0 ms or greater.")
            return

        if not self.seq_model.add_step(angle=angle, speed_ms=speed_ms, wait_ms=wait_ms):
            messagebox.showwarning("Limit Reached", "Cannot add step. Maximum 30 steps reached.")
            return

        self._render_step_list()

    def _delete_step(self, index: int) -> None:
        self.seq_model.delete_step(index)
        self._render_step_list()

    def _clear_all_steps(self) -> None:
        self.seq_model.clear()
        self._render_step_list()

    def _render_step_list(self) -> None:
        # Clear previous rows in scrollable frame
        for widget in self.steps_scroll.winfo_children():
            widget.destroy()

        steps = self.seq_model.get_steps()
        self.seq_count_lbl.configure(text=f"Steps: {len(steps)} / {self.seq_model.MAX_STEPS}")

        if not steps:
            empty_lbl = ctk.CTkLabel(self.steps_scroll, text="No steps recorded yet. Capture or add steps above.", text_color="#757575")
            empty_lbl.pack(pady=20)
            return

        # Render each step row: Index | Angle | Speed | Wait | [✕]
        for i, step in enumerate(steps):
            row = ctk.CTkFrame(self.steps_scroll, fg_color="#2A2A2A", corner_radius=4)
            row.pack(fill="x", padx=4, pady=2)

            num_lbl = ctk.CTkLabel(row, text=f"#{i+1:02d}", width=30, font=ctk.CTkFont(weight="bold"))
            num_lbl.pack(side="left", padx=4)

            ang_lbl = ctk.CTkLabel(row, text=f"{step.angle:3d}°", width=50, font=ctk.CTkFont(weight="bold"), text_color="#64B5F6")
            ang_lbl.pack(side="left", padx=4)

            spd_text = f"Spd: {step.speed_ms} ms/deg" if step.speed_ms > 0 else "Spd: Instant"
            spd_lbl = ctk.CTkLabel(row, text=spd_text, width=95)
            spd_lbl.pack(side="left", padx=4)

            wait_lbl = ctk.CTkLabel(row, text=f"Wait: {step.wait_ms} ms", width=95)
            wait_lbl.pack(side="left", padx=4)

            del_btn = ctk.CTkButton(
                row,
                text="✕",
                width=24,
                height=22,
                fg_color="#B71C1C",
                hover_color="#D32F2F",
                command=lambda idx=i: self._delete_step(idx)
            )
            del_btn.pack(side="right", padx=6, pady=2)

    def _upload_sequence(self) -> None:
        if self.seq_model.count() == 0:
            messagebox.showwarning("Empty Sequence", "No steps in sequence to upload.")
            return

        cmd = self.seq_model.to_protocol_string()
        if self.serial_mgr.is_connected():
            self.serial_mgr.send_command(cmd)
            self.log_message(cmd, is_tx=True)
        else:
            messagebox.showwarning("Not Connected", "Please connect to ESP32-C6 first.")

    def _play_cycle(self) -> None:
        cmd = "PLAY:1"
        if self.serial_mgr.is_connected():
            self.serial_mgr.send_command(cmd)
            self.log_message(cmd, is_tx=True)
        else:
            messagebox.showwarning("Not Connected", "Please connect to ESP32-C6 first.")

    def _save_preset(self) -> None:
        if self.seq_model.count() == 0:
            messagebox.showwarning("Empty Sequence", "Cannot save an empty sequence preset.")
            return

        path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON Presets", "*.json"), ("All Files", "*.*")],
            title="Save Servo Sequence Preset"
        )
        if path:
            try:
                self.seq_model.save_to_json(path)
                self.log_message(f"Preset saved to: {path}", is_tx=False)
            except Exception as e:
                messagebox.showerror("Save Error", f"Failed to save preset: {e}")

    def _load_preset(self) -> None:
        path = filedialog.askopenfilename(
            defaultextension=".json",
            filetypes=[("JSON Presets", "*.json"), ("All Files", "*.*")],
            title="Load Servo Sequence Preset"
        )
        if path:
            try:
                self.seq_model.load_from_json(path)
                self._render_step_list()
                self.log_message(f"Preset loaded from: {path} ({self.seq_model.count()} steps)", is_tx=False)
            except Exception as e:
                messagebox.showerror("Load Error", f"Failed to load preset: {e}")
