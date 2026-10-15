#!/usr/bin/env python3
"""Write the Play upload keystore Gradle reads on a GitHub Actions runner.

Values come from the environment so they are not command-line arguments.
"""

import base64
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def prop(value: str) -> str:
    return value.replace("\\", "\\\\").replace("\n", "\\n").replace("\r", "\\r")


def write_keystore() -> None:
    raw = os.environ.get("PLAY_UPLOAD_KEYSTORE_BASE64", "").strip()
    store_password = os.environ.get("PLAY_UPLOAD_KEYSTORE_PASSWORD", "")
    alias = os.environ.get("PLAY_UPLOAD_KEY_ALIAS", "")
    key_password = os.environ.get("PLAY_UPLOAD_KEY_PASSWORD", "")
    if not raw or not store_password or not alias or not key_password:
        raise SystemExit("Play upload keystore secrets are incomplete")
    dest = ROOT / "android" / "app" / "keystore.jks"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(base64.b64decode(raw))
    os.chmod(dest, 0o600)
    lines = [
        "storeFile=keystore.jks",
        f"storePassword={prop(store_password)}",
        f"keyAlias={prop(alias)}",
        f"keyPassword={prop(key_password)}",
    ]
    props = ROOT / "android" / "keystore.properties"
    props.write_text("\n".join(lines) + "\n")
    os.chmod(props, 0o600)
    print("signing: Play upload keystore")


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "keystore":
        write_keystore()
    else:
        raise SystemExit("usage: ci-android-env.py keystore")


if __name__ == "__main__":
    main()
