#!/usr/bin/env python3

Import("env")  # pylint: disable=undefined-variable


def upload_filesystem_and_firmware(source, target, env):
    """Upload filesystem first, then firmware"""
    # Note: source and target parameters required by PlatformIO callback signature
    _ = source, target  # Suppress unused parameter warnings

    print("🚀 Starting complete upload process...")

    # Upload filesystem
    print("📁 Uploading filesystem...")
    fs_result = env.Execute("pio run --target uploadfs")
    if fs_result != 0:
        print("❌ Filesystem upload failed!")
        env.Exit(1)

    # Upload firmware
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
    title="Upload FS + Firmware",
    description="Upload filesystem and firmware in sequence",
)
