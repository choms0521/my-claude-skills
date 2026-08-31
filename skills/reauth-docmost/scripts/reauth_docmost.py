#!/usr/bin/env python3
"""Refresh the docmost MCP auth token from the local Chrome session (macOS).

The docmost MCP server (both Claude Code and Codex) authenticates with a Bearer
token that is the same value as the `authToken` cookie held by a logged-in
docmost web session. This script reads that cookie straight from Chrome's local
cookie store, decrypts it, and writes it into the single source of truth
(`~/.claude.json` -> mcpServers.docmost.headers.Authorization). Codex inherits
the same value through its http_headers_helper, so only one file is updated.

Usage:
    python3 reauth_docmost.py --dry-run   # extract + report, write nothing
    python3 reauth_docmost.py             # extract + inject into config

Exit codes:
    0  success (token written) or dry-run passed all gates
    2  no usable authToken cookie found / decryption failed
    3  extracted token is expired or expiring within the safety margin
    4  extracted token equals the token already in the config (re-run won't help)
    5  mcpServers.docmost is absent from the config (nothing to update)
    1  any other error
"""

import argparse
import base64
import datetime as dt
import glob
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile

HOST = "172.31.79.201"
COOKIE_NAME = "authToken"
MCP_KEY = "docmost"

HOME = os.path.expanduser("~")
CHROME_DIR = os.path.join(HOME, "Library", "Application Support", "Google", "Chrome")
CLAUDE_CONFIG = os.path.join(HOME, ".claude.json")
CODEX_CONFIG = os.path.join(HOME, ".codex", "config.toml")
CODEX_TOKEN_ENV = os.path.join(HOME, ".codex", "docmost-token.env")
BEARER_ENV_VAR = "DOCMOST_MCP_TOKEN"
SHELL_PROFILES = [
    os.path.join(HOME, name)
    for name in (".zshrc", ".zshenv", ".zprofile", ".bashrc", ".bash_profile", ".profile")
]

# macOS Chrome cookie encryption parameters (stable for years).
KEYCHAIN_SERVICE = "Chrome Safe Storage"
KEYCHAIN_ACCOUNT = "Chrome"
KDF_SALT = b"saltysalt"
KDF_ITERATIONS = 1003
KDF_KEY_LEN = 16
AES_IV = b" " * 16

DEFAULT_MARGIN_SECONDS = 300


class ReauthError(Exception):
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code


def mask(token):
    if len(token) <= 24:
        return "***"
    return f"{token[:12]}...{token[-8:]}"


def keychain_password():
    try:
        result = subprocess.run(
            ["security", "find-generic-password", "-w",
             "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT],
            capture_output=True, text=True, check=True,
        )
    except FileNotFoundError as exc:
        raise ReauthError("`security` command not found (macOS only).", 1) from exc
    except subprocess.CalledProcessError as exc:
        raise ReauthError(
            "Could not read the 'Chrome Safe Storage' key from the Keychain. "
            "Grant access when macOS prompts, or unlock the login keychain.",
            2,
        ) from exc
    return result.stdout.strip().encode("utf-8")


def derive_key(password):
    return hashlib.pbkdf2_hmac("sha1", password, KDF_SALT, KDF_ITERATIONS, KDF_KEY_LEN)


def aes_cbc_decrypt(key, data):
    # Imported lazily so a missing dependency yields a clear message.
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    except ImportError as exc:
        raise ReauthError(
            "Python package 'cryptography' is required. Install it with "
            "`python3 -m pip install cryptography`.",
            1,
        ) from exc
    decryptor = Cipher(algorithms.AES(key), modes.CBC(AES_IV)).decryptor()
    return decryptor.update(data) + decryptor.finalize()


def decrypt_cookie(encrypted, key, host_key):
    if encrypted[:3] in (b"v10", b"v11"):
        encrypted = encrypted[3:]
    plaintext = aes_cbc_decrypt(key, encrypted)
    # Strip PKCS7 padding.
    if plaintext:
        pad = plaintext[-1]
        if 1 <= pad <= 16 and plaintext[-pad:] == bytes([pad]) * pad:
            plaintext = plaintext[:-pad]
    # Chrome >= v130 prepends SHA256(host_key) to the plaintext.
    domain_hash = hashlib.sha256(host_key.encode("utf-8")).digest()
    if plaintext[:32] == domain_hash:
        plaintext = plaintext[32:]
    return plaintext.decode("utf-8", "strict")


def cookie_dbs():
    dbs = []
    default_db = os.path.join(CHROME_DIR, "Default", "Cookies")
    for candidate in sorted(set([default_db] + glob.glob(os.path.join(CHROME_DIR, "*", "Cookies")))):
        if os.path.exists(candidate):
            dbs.append(candidate)
    return dbs


def read_encrypted_cookies(db_path):
    tmp_dir = tempfile.mkdtemp(prefix="reauth-docmost-")
    try:
        copy_path = os.path.join(tmp_dir, "Cookies")
        shutil.copy2(db_path, copy_path)
        for ext in ("-wal", "-shm"):
            side = db_path + ext
            if os.path.exists(side):
                shutil.copy2(side, copy_path + ext)
        con = sqlite3.connect(copy_path)
        try:
            rows = con.execute(
                "SELECT host_key, encrypted_value FROM cookies "
                "WHERE host_key LIKE ? AND name = ?",
                (f"%{HOST}%", COOKIE_NAME),
            ).fetchall()
        finally:
            con.close()
        return rows
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def jwt_claims(token):
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("not a JWT")
    payload = parts[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))


def collect_candidates(key):
    candidates = []
    for db_path in cookie_dbs():
        profile = os.path.basename(os.path.dirname(db_path))
        for host_key, encrypted in read_encrypted_cookies(db_path):
            try:
                token = decrypt_cookie(encrypted, key, host_key)
                claims = jwt_claims(token)
            except Exception:
                continue
            candidates.append({
                "profile": profile,
                "token": token,
                "exp": int(claims.get("exp", 0)),
                "email": claims.get("email", ""),
            })
    return candidates


def fmt_ts(epoch):
    if not epoch:
        return "unknown"
    local = dt.datetime.fromtimestamp(epoch)
    utc = dt.datetime.utcfromtimestamp(epoch)
    return f"{local:%Y-%m-%d %H:%M:%S} (local) / {utc:%Y-%m-%d %H:%M:%S}Z"


def load_config():
    try:
        with open(CLAUDE_CONFIG, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except FileNotFoundError as exc:
        raise ReauthError(f"Config not found: {CLAUDE_CONFIG}", 1) from exc
    data = json.loads(raw)
    servers = data.get("mcpServers")
    if not isinstance(servers, dict) or MCP_KEY not in servers:
        raise ReauthError(
            f"mcpServers.{MCP_KEY} is absent from {CLAUDE_CONFIG}; refusing to "
            "create it. Configure the docmost MCP server first.",
            5,
        )
    headers = servers[MCP_KEY].setdefault("headers", {})
    current = headers.get("Authorization", "")
    return raw, data, current


def current_token(authorization):
    value = authorization or ""
    if value.startswith("Bearer "):
        return value[len("Bearer "):].strip()
    return value.strip()


def write_config(raw, old_authorization, new_authorization):
    needle = json.dumps(old_authorization) if old_authorization else None
    replacement = json.dumps(new_authorization)

    if needle and raw.count(needle) == 1:
        new_raw = raw.replace(needle, replacement)
    else:
        # Old value missing, empty, or ambiguous: fall back to a structural
        # round-trip so exactly one Authorization value is set.
        data = json.loads(raw)
        data["mcpServers"][MCP_KEY].setdefault("headers", {})["Authorization"] = new_authorization
        new_raw = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    # Sanity: result must parse and carry the new value.
    check = json.loads(new_raw)
    if check["mcpServers"][MCP_KEY]["headers"]["Authorization"] != new_authorization:
        raise ReauthError("Post-write sanity check failed; config left untouched.", 1)

    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = f"{CLAUDE_CONFIG}.bak-reauth-docmost-{stamp}"
    shutil.copy2(CLAUDE_CONFIG, backup)

    directory = os.path.dirname(CLAUDE_CONFIG) or "."
    fd, tmp_path = tempfile.mkstemp(prefix=".claude.json.", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(new_raw)
        shutil.copymode(CLAUDE_CONFIG, tmp_path)
        os.replace(tmp_path, CLAUDE_CONFIG)
    except BaseException:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
    return backup


def codex_preflight():
    # Codex 0.151.0+ rejects an Authorization header returned by http_headers_helper
    # as a reserved header, so the token must reach Codex through its own process
    # environment via bearer_token_env_var. ~/.codex/docmost-token.env derives that
    # value from ~/.claude.json and must be sourced by a shell profile.
    config_wired = False
    if os.path.exists(CODEX_CONFIG):
        try:
            with open(CODEX_CONFIG, "r", encoding="utf-8") as handle:
                config_wired = BEARER_ENV_VAR in handle.read()
        except OSError:
            config_wired = False

    env_file_ok = os.path.exists(CODEX_TOKEN_ENV)

    sourced = False
    for profile in SHELL_PROFILES:
        try:
            with open(profile, "r", encoding="utf-8") as handle:
                if "docmost-token.env" in handle.read():
                    sourced = True
                    break
        except OSError:
            continue

    if config_wired and env_file_ok and sourced:
        return ("Codex wiring: found (bearer_token_env_var + ~/.codex/docmost-token.env "
                "sourced from your shell) -> a NEW Codex shell inherits the refreshed token.")

    missing = []
    if not config_wired:
        missing.append(f"config.toml lacks bearer_token_env_var = \"{BEARER_ENV_VAR}\"")
    if not env_file_ok:
        missing.append("~/.codex/docmost-token.env is missing")
    if not sourced:
        missing.append("no shell profile sources ~/.codex/docmost-token.env")
    return "Codex wiring: INCOMPLETE (" + "; ".join(missing) + ") -> Codex will NOT pick this up."


def run(args):
    key = derive_key(keychain_password())
    candidates = collect_candidates(key)
    if not candidates:
        raise ReauthError(
            f"No decryptable '{COOKIE_NAME}' cookie for {HOST} in any Chrome profile. "
            f"Log in at http://{HOST}:3000 in Chrome first.",
            2,
        )

    # Freshest token = furthest JWT exp (expires_utc is unreliable for session cookies).
    best = max(candidates, key=lambda c: c["exp"])
    now = int(dt.datetime.now().timestamp())

    raw, _data, current_authorization = load_config()
    existing = current_token(current_authorization)

    # Which config write path would run, computed without touching the file so a
    # dry-run reports it even when a gate (e.g. same-token) stops before writing.
    needle = json.dumps(current_authorization) if current_authorization else None
    needle_count = raw.count(needle) if needle else 0
    write_branch = ("surgical single-value replace"
                    if needle_count == 1
                    else f"full-rewrite fallback (Authorization matches in raw: {needle_count})")

    print(f"Extracted token: {mask(best['token'])}")
    print(f"  profile      : {best['profile']}")
    if best["email"]:
        print(f"  account      : {best['email']}")
    print(f"  expires      : {fmt_ts(best['exp'])}")
    print(f"  config token : {mask(existing) if existing else '(none)'}")
    print(f"  write path   : {write_branch}")
    print(codex_preflight())

    if best["exp"] and best["exp"] <= now + args.margin_seconds:
        raise ReauthError(
            f"Browser token is expired or expiring within {args.margin_seconds}s "
            f"(exp {fmt_ts(best['exp'])}). Re-login at http://{HOST}:3000 in Chrome, "
            "then run this again.",
            3,
        )

    if existing and best["token"] == existing:
        raise ReauthError(
            "The browser holds the same token that is already in the config. "
            f"Re-running will not help. Re-login at http://{HOST}:3000 to mint a new token.",
            4,
        )

    new_authorization = f"Bearer {best['token']}"

    if args.dry_run:
        print("\n[dry-run] All gates passed. Would update "
              "mcpServers.docmost.headers.Authorization. No file written.")
        return 0

    backup = write_config(raw, current_authorization, new_authorization)
    print(f"\nUpdated {CLAUDE_CONFIG}")
    print(f"Backup : {backup}")
    print("Next   : make the new token take effect —")
    print("         Claude: /mcp -> reconnect docmost.")
    print("         Codex : open a NEW shell (or `source ~/.codex/docmost-token.env`), "
          "then restart Codex so it re-reads DOCMOST_MCP_TOKEN.")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Refresh docmost MCP auth token from Chrome.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Extract and report only; do not write the config.")
    parser.add_argument("--margin-seconds", type=int, default=DEFAULT_MARGIN_SECONDS,
                        help="Abort if the token expires within this many seconds "
                             f"(default {DEFAULT_MARGIN_SECONDS}).")
    args = parser.parse_args(argv)
    try:
        return run(args)
    except ReauthError as err:
        print(f"ERROR: {err}", file=sys.stderr)
        return err.code


if __name__ == "__main__":
    sys.exit(main())
