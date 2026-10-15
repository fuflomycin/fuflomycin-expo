#!/usr/bin/env python3
"""Version code and closed-testing publish for the Play Android Publisher API.

Track id alpha is closed testing. The release status is completed.
versionCode is the highest code already on Play plus one.
"""

import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PACKAGE = "com.fuflomycin_rn"
TRACK = "alpha"
NOTE_LANGUAGE = "ru-RU"
NOTE_LIMIT = 500
PLAY_UPLOAD_SHA1 = "E7:A4:59:31:8C:F5:DC:14:F1:B2:92:E0:0A:8D:21:C1:05:7A:6F:8E"
API = "https://androidpublisher.googleapis.com/androidpublisher/v3"
UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3"
ROOT = Path(__file__).resolve().parent.parent


def version_code(highest_on_play: int) -> int:
    if highest_on_play < 1:
        raise ValueError("Play returned no version codes")
    return highest_on_play + 1


def release_note(message: str, sha: str) -> str:
    line = ""
    for raw in message.splitlines():
        if raw.strip():
            line = raw.strip()
            break
    if not line:
        line = sha[:7]
    return line[:NOTE_LIMIT]


def self_check() -> None:
    assert version_code(21) == 22
    assert version_code(22) == 23
    try:
        version_code(0)
    except ValueError:
        pass
    else:
        raise AssertionError("zero version code was accepted")
    assert release_note("Hello\nbody", "abcdef1234567890") == "Hello"
    assert release_note("   \n", "abcdef1234567890") == "abcdef1"
    assert len(release_note("я" * 600, "abc")) == NOTE_LIMIT
    print("play-closed-track self-check ok")


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def load_service_account() -> dict:
    path = os.environ.get("PLAY_SERVICE_ACCOUNT_FILE", "").strip()
    if not path:
        raise SystemExit("PLAY_SERVICE_ACCOUNT_FILE is empty")
    return json.loads(Path(path).read_text())


def sign(private_key_pem: str, data: bytes) -> bytes:
    handle = tempfile.NamedTemporaryFile("w", delete=False)
    handle.write(private_key_pem)
    handle.close()
    os.chmod(handle.name, 0o600)
    try:
        proc = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", handle.name],
            input=data,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if proc.returncode != 0:
            raise SystemExit("openssl could not sign the Play auth assertion")
        return proc.stdout
    finally:
        os.remove(handle.name)


def access_token(account: dict) -> str:
    now = int(time.time())
    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = {
        "iss": account["client_email"],
        "scope": "https://www.googleapis.com/auth/androidpublisher",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }
    payload = b64url(json.dumps(claims, separators=(",", ":")).encode())
    signing_input = f"{header}.{payload}".encode()
    assertion = signing_input + b"." + b64url(sign(account["private_key"], signing_input)).encode()
    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion.decode(),
        }
    ).encode()
    request = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            parsed = json.loads(response.read().decode())
    except urllib.error.HTTPError as err:
        detail = err.read().decode(errors="replace")[:300]
        raise SystemExit(f"Play auth failed ({err.code}): {detail}") from None
    token = parsed.get("access_token")
    if not token:
        raise SystemExit("Play auth returned no access token")
    return token


def api(token: str, method: str, url: str, body=None, timeout: int = 120):
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if isinstance(body, (dict, list)):
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    elif isinstance(body, bytes):
        data = body
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as err:
        return err.code, err.headers, err.read()


def app_missing(status: int, raw: bytes) -> bool:
    text = raw.decode(errors="replace").lower()
    return status in (403, 404) and (
        "package not found" in text or "caller does not have permission" in text
    )


def fail_unless_ok(status: int, raw: bytes, what: str) -> dict:
    if app_missing(status, raw):
        raise SystemExit(
            "Play has no application com.fuflomycin_rn, or the service account cannot see it. "
            "Invite the service account to this app in Play Console, then re-run this workflow. "
            f"({status})"
        )
    text = raw.decode(errors="replace")
    if status < 200 or status >= 300:
        raise SystemExit(f"{what} failed ({status}): {text[:500]}")
    if not text.strip():
        return {}
    return json.loads(text)


def create_edit(token: str) -> str:
    status, _, raw = api(token, "POST", f"{API}/applications/{PACKAGE}/edits", {})
    body = fail_unless_ok(status, raw, "create edit")
    edit_id = body.get("id")
    if not edit_id:
        raise SystemExit("Play edit response had no id")
    return edit_id


def delete_edit(token: str, edit_id: str) -> None:
    status, _, raw = api(token, "DELETE", f"{API}/applications/{PACKAGE}/edits/{edit_id}")
    if status not in (200, 204):
        text = raw.decode(errors="replace")[:300]
        print(f"warning: could not delete Play edit ({status}): {text}", flush=True)


def highest_on_play(token: str) -> int:
    edit_id = create_edit(token)
    try:
        status, _, raw = api(token, "GET", f"{API}/applications/{PACKAGE}/edits/{edit_id}/tracks")
        body = fail_unless_ok(status, raw, "list tracks")
        highest = 0
        for track in body.get("tracks") or []:
            for release in track.get("releases") or []:
                for code in release.get("versionCodes") or []:
                    highest = max(highest, int(code))
        return highest
    finally:
        delete_edit(token, edit_id)


def upload_bundle(token: str, edit_id: str, aab: Path) -> int:
    size = aab.stat().st_size
    start = urllib.request.Request(
        f"{UPLOAD}/applications/{PACKAGE}/edits/{edit_id}/bundles?uploadType=resumable",
        data=b"",
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream",
            "X-Upload-Content-Type": "application/octet-stream",
            "X-Upload-Content-Length": str(size),
            "Content-Length": "0",
        },
    )
    try:
        with urllib.request.urlopen(start, timeout=60) as response:
            location = response.headers.get("Location")
            start_status = response.status
    except urllib.error.HTTPError as err:
        text = err.read().decode(errors="replace")[:500]
        raise SystemExit(f"start AAB upload failed ({err.code}): {text}") from None
    if not location:
        raise SystemExit(f"AAB upload returned no Location ({start_status})")
    put = urllib.request.Request(
        location,
        data=aab.read_bytes(),
        method="PUT",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream",
            "Content-Length": str(size),
        },
    )
    try:
        with urllib.request.urlopen(put, timeout=300) as response:
            body = json.loads(response.read().decode())
    except urllib.error.HTTPError as err:
        text = err.read().decode(errors="replace")[:500]
        raise SystemExit(f"AAB upload failed ({err.code}): {text}") from None
    code = body.get("versionCode")
    if not isinstance(code, int):
        raise SystemExit("AAB upload response had no versionCode")
    return code


def version_name() -> str:
    text = (ROOT / "android" / "app" / "build.gradle.kts").read_text()
    marker = 'versionName = "'
    start = text.find(marker)
    if start < 0:
        raise SystemExit("versionName not found in build.gradle.kts")
    start += len(marker)
    end = text.find('"', start)
    return text[start:end]


def check_cert(aab: Path) -> None:
    proc = subprocess.run(
        ["keytool", "-printcert", "-jarfile", str(aab)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        text=True,
    )
    actual = ""
    for line in proc.stdout.splitlines():
        if "SHA1:" in line:
            actual = line.split("SHA1:", 1)[1].strip()
            break
    if actual != PLAY_UPLOAD_SHA1:
        raise SystemExit(
            f"AAB signed with {actual or 'no SHA1'}, Play upload cert is {PLAY_UPLOAD_SHA1}"
        )
    print(f"SHA1 {actual}")


def cmd_version_code() -> None:
    token = access_token(load_service_account())
    highest = highest_on_play(token)
    code = version_code(highest)
    print(f"Play highest versionCode {highest}; this build {code}", file=sys.stderr)
    print(code)


def cmd_note() -> None:
    message = os.environ.get("COMMIT_MESSAGE", "")
    sha = os.environ.get("GITHUB_SHA", "")
    if not sha:
        raise SystemExit("GITHUB_SHA is empty")
    sys.stdout.write(release_note(message, sha))


def cmd_publish() -> None:
    aab = Path(os.environ["AAB_PATH"])
    notes = Path(os.environ["RELEASE_NOTES_FILE"]).read_text().strip()[:NOTE_LIMIT]
    if not aab.is_file():
        raise SystemExit(f"missing AAB at {aab}")
    if not notes:
        raise SystemExit("release notes are empty")
    check_cert(aab)
    token = access_token(load_service_account())
    edit_id = create_edit(token)
    committed = False
    try:
        code = upload_bundle(token, edit_id, aab)
        name = version_name()
        track = {
            "track": TRACK,
            "releases": [
                {
                    "name": name,
                    "versionCodes": [str(code)],
                    "status": "completed",
                    "releaseNotes": [{"language": NOTE_LANGUAGE, "text": notes}],
                }
            ],
        }
        status, _, raw = api(
            token,
            "PUT",
            f"{API}/applications/{PACKAGE}/edits/{edit_id}/tracks/{TRACK}",
            track,
        )
        fail_unless_ok(status, raw, "update closed-testing track")
        status, _, raw = api(
            token,
            "POST",
            f"{API}/applications/{PACKAGE}/edits/{edit_id}:commit",
            {},
        )
        fail_unless_ok(status, raw, "commit edit")
        committed = True
        print(f"rolled out {name} ({code}) to closed testing")
    finally:
        if not committed:
            delete_edit(token, edit_id)


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "self-check":
        self_check()
    elif command == "version-code":
        cmd_version_code()
    elif command == "note":
        cmd_note()
    elif command == "publish":
        cmd_publish()
    elif command == "check-cert":
        check_cert(Path(os.environ["AAB_PATH"]))
    else:
        raise SystemExit(
            "usage: play-closed-track.py self-check|version-code|note|publish|check-cert"
        )


if __name__ == "__main__":
    main()
