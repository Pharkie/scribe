#!/usr/bin/env python3

Import("env")  # pylint: disable=undefined-variable
import os
import subprocess
import time
import glob

# Get the virtual environment Python path
VENV_PYTHON = os.path.join(os.getcwd(), ".venv", "bin", "python")
CURRENT_PYTHON = VENV_PYTHON if os.path.exists(VENV_PYTHON) else "python3"

# Try to import pyserial, but don't fail if it's not available
try:
    import serial

    HAS_PYSERIAL = True
except ImportError:
    HAS_PYSERIAL = False


def find_esp32_port():
    """Find ESP32 serial port on macOS"""
    possible_ports = [
        "/dev/cu.usbserial-*",
        "/dev/cu.SLAB_USBtoUART*",
        "/dev/cu.usbmodem*",
        "/dev/cu.wchusbserial*",
    ]

    for pattern in possible_ports:
        ports = glob.glob(pattern)
        if ports:
            print(f"🔍 Found potential ESP32 port: {ports[0]}")
            return ports[0]

    print("⚠️  No ESP32 port automatically detected")
    return None


def reset_esp32_connection(port=None):
    """Reset ESP32 connection and clear serial buffers"""
    if not HAS_PYSERIAL:
        print("⚠️  Skipping ESP32 reset - pyserial not available")
        return

    if not port:
        port = find_esp32_port()

    if not port:
        print("⚠️  Skipping ESP32 reset - no port found")
        return

    try:
        print(f"🔄 Resetting ESP32 connection on {port}...")

        # Multiple reset attempts for reliability
        for attempt in range(2):
            print(f"   Reset attempt {attempt + 1}/2...")
            ser = serial.Serial(port, 115200, timeout=1)

            # Clear any existing buffers
            ser.reset_input_buffer()
            ser.reset_output_buffer()

            # Hardware reset sequence
            ser.setDTR(False)  # Assert reset
            ser.setRTS(False)  # Also try RTS
            time.sleep(0.1)

            ser.setDTR(True)  # Release reset
            ser.setRTS(True)  # Release RTS
            time.sleep(0.1)

            ser.close()
            time.sleep(0.2)

        # Longer delay for ESP32 to fully stabilize
        time.sleep(1.0)
        print("✅ ESP32 connection reset completed")

    except (serial.SerialException, OSError) as e:
        print(f"⚠️  ESP32 reset failed (continuing anyway): {e}")


def kill_serial_processes():
    """Kill any processes that might be holding serial ports"""
    try:
        print("🔄 Checking for serial port conflicts...")

        # Kill any screen sessions on USB serial ports
        subprocess.run(
            ["pkill", "-f", "screen.*usbserial"],
            capture_output=True,
            check=False,  # Don't fail if no processes found
        )

        # Kill any minicom sessions
        subprocess.run(["pkill", "-f", "minicom"], capture_output=True, check=False)

        # Kill any other PlatformIO monitor sessions
        subprocess.run(
            ["pkill", "-f", "pio.*monitor"], capture_output=True, check=False
        )

        # Kill any VS Code serial monitor extensions
        subprocess.run(
            ["pkill", "-f", "code.*serial"], capture_output=True, check=False
        )

        print("✅ Serial port cleanup completed")
        time.sleep(0.5)  # Brief delay for processes to terminate

    except (subprocess.SubprocessError, OSError) as e:
        print(f"⚠️  Serial cleanup warning: {e}")


def reset_usb_on_macos():
    """Reset USB subsystem on macOS for better ESP32 reliability"""
    try:
        print("🔄 Resetting USB subsystem...")

        # Restart the USB daemon (requires admin rights, but may help)
        result = subprocess.run(
            ["sudo", "-n", "kextunload", "-b", "com.apple.driver.usb.IOUSBHostFamily"],
            capture_output=True,
            check=False,  # Don't fail if this doesn't work
        )

        if result.returncode == 0:
            time.sleep(0.5)
            subprocess.run(
                [
                    "sudo",
                    "-n",
                    "kextload",
                    "-b",
                    "com.apple.driver.usb.IOUSBHostFamily",
                ],
                capture_output=True,
                check=False,
            )
            print("✅ USB subsystem reset completed")
        else:
            print("⚠️  USB reset skipped (requires sudo)")

    except (subprocess.SubprocessError, OSError) as e:
        print(f"⚠️  USB reset warning: {e}")


def ensure_python_environment():
    """Ensure Python virtual environment is set up with required packages"""
    venv_path = os.path.join(os.getcwd(), ".venv")

    if not os.path.exists(venv_path):
        print("🐍 Creating Python virtual environment...")
        try:
            subprocess.run(
                ["python3", "-m", "venv", venv_path], check=True, capture_output=True
            )
            print("✅ Virtual environment created")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to create virtual environment: {e}")
            return False

    # Install/update requirements
    requirements_file = os.path.join(os.getcwd(), "requirements.txt")
    if os.path.exists(requirements_file):
        print("📦 Installing Python dependencies...")
        try:
            subprocess.run(
                [CURRENT_PYTHON, "-m", "pip", "install", "-r", requirements_file],
                check=True,
                capture_output=True,
            )
            print("✅ Python dependencies installed")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Warning: Failed to install dependencies: {e}")

    return True


def upload_filesystem_and_firmware(source, target, env):
    """Upload filesystem first, then firmware with enhanced reliability"""
    # Note: source and target parameters required by PlatformIO callback signature
    _ = source, target  # Suppress unused parameter warnings

    print("🚀 Starting complete upload process...")

    # Step 0: Ensure Python environment is set up
    print("🐍 Checking Python environment...")
    if not ensure_python_environment():
        print("❌ Python environment setup failed!")
        env.Exit(1)

    # Step 0.5: Prepare serial connections
    print("🔧 Preparing ESP32 connection...")
    kill_serial_processes()
    reset_esp32_connection()

    # Step 1: Build Tailwind CSS
    print("🎨 Building Tailwind CSS...")
    try:
        # Run npm build-css command
        result = subprocess.run(
            ["npm", "run", "build-css"],
            cwd=os.getcwd(),  # Current working directory
            check=True,
            capture_output=True,
            text=True,
        )
        print("✅ Tailwind CSS build completed successfully!")
        if result.stdout:
            print(f"   Output: {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        print("❌ Tailwind CSS build failed!")
        print(f"   Error: {e.stderr}")
        env.Exit(1)
    except FileNotFoundError:
        print("❌ npm not found! Please ensure Node.js and npm are installed.")
        env.Exit(1)

    # Step 2: Upload filesystem
    print("📁 Uploading filesystem...")
    fs_result = env.Execute("pio run --target uploadfs")
    if fs_result != 0:
        print("❌ Filesystem upload failed!")
        env.Exit(1)

    # Step 2.5: Reset connection before firmware upload
    print("🔄 Resetting connection for firmware upload...")
    time.sleep(1)  # Brief pause between uploads
    kill_serial_processes()  # Additional cleanup
    reset_esp32_connection()

    # Step 3: Upload firmware
    print("💾 Uploading firmware...")
    fw_result = env.Execute("pio run --target upload")
    if fw_result != 0:
        print("❌ Firmware upload failed!")
        env.Exit(1)

    print("✅ Complete upload finished!")


# Add custom target
env.AddCustomTarget(  # pylint: disable=undefined-variable
    name="upload_all",
    dependencies=None,
    actions=[upload_filesystem_and_firmware],
    title="Setup + Build CSS + Upload FS + Firmware",
    description="Setup Python environment, build Tailwind CSS, then upload filesystem and firmware with ESP32 reset",
)
