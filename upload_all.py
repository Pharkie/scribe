#!/usr/bin/env python3

Import("env")


def upload_filesystem_and_firmware(source, target, env):
    """Upload filesystem first, then firmware"""
    print("🚀 Starting complete upload process...")

    # Upload filesystem
    print("📁 Uploading filesystem...")
    env.Execute("pio run --target uploadfs")

    # Upload firmware
    print("💾 Uploading firmware...")
    env.Execute("pio run --target upload")

    print("✅ Complete upload finished!")


# Add custom target
env.AddCustomTarget(
    name="upload_all",
    dependencies=None,
    actions=[upload_filesystem_and_firmware],
    title="Upload FS + Firmware",
    description="Upload filesystem and firmware in sequence",
)
