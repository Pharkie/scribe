#!/usr/bin/env python3
# pylint: disable=undefined-variable
# type: ignore

import subprocess

Import("env")  # pylint: disable=undefined-variable  # type: ignore


def build_upload_monitor(source, target, env):  # pylint: disable=unused-argument
    """Build, Upload FS & Firmware, Monitor - complete workflow"""
    print("🚀 Starting build_upload_monitor workflow...")

    # Resolve the active PlatformIO environment name
    try:
        env_name = env.get("PIOENV") or env.subst("$PIOENV")
    except Exception:  # pylint: disable=broad-except
        env_name = None

    if not env_name:
        print("❌ Could not determine current PlatformIO environment (PIOENV)")
        return 1

    print(f"🔧 Using PlatformIO env: {env_name}")

    # Step 1: Build frontend
    print("📦 Building frontend...")
    result = subprocess.run(["npm", "run", "build"], check=False)
    if result.returncode != 0:
        print(f"❌ Frontend build failed with exit code {result.returncode}")
        return result.returncode
    print("✅ Frontend build completed")

    # Step 2: Upload filesystem
    print("📁 Uploading filesystem...")
    fs_result = env.Execute(f"pio run -e {env_name} -t uploadfs")
    if fs_result != 0:
        print(f"❌ Filesystem upload failed with exit code {fs_result}")
        return fs_result
    print("✅ Filesystem upload completed")

    # Step 3: Upload firmware (auto-builds if needed)
    print("💾 Building and uploading firmware...")
    fw_result = env.Execute(f"pio run -e {env_name} -t upload")
    if fw_result != 0:
        print(f"❌ Firmware upload failed with exit code {fw_result}")
        return fw_result
    print("✅ Firmware upload completed")

    # Play success sound notification
    print("🔊 Playing success notification...")
    try:
        # Play macOS "Glass" system sound
        subprocess.run(
            ["/usr/bin/afplay", "-v", "0.8", "/System/Library/Sounds/Glass.aiff"],
            check=False,
        )
        print("🎵 Success sound played")
    except (subprocess.SubprocessError, FileNotFoundError, OSError) as e:
        print(f"⚠️ Could not play sound: {e}")

    # Step 4: Start monitoring
    print("📺 Starting serial monitor...")
    env.Execute(f"pio run -e {env_name} -t monitor")

    return 0


env.AddCustomTarget(  # pylint: disable=undefined-variable  # type: ignore
    "build_upload_monitor",
    None,
    build_upload_monitor,
    "Build, Upload FS & Firmware, Monitor",
    "Build frontend + Upload filesystem + Upload firmware + Start monitor",
)
