"""Cross-platform single-process exclusive lock for in-memory event bus and agent fleet."""
import logging
import os
import sys
from pathlib import Path

log = logging.getLogger("identityshield.lock")

_held_locks: set[Path] = set()


class ProcessLock:
    """Exclusive lock protecting the in-memory bus against multi-worker split-brain."""

    def __init__(self, lock_path: Path | str | None = None) -> None:
        if lock_path is None:
            from app.config import DATA_DIR
            lock_path = DATA_DIR / ".agents.lock"
        self.lock_path = Path(lock_path)
        self.pid_path = self.lock_path.with_suffix(".pid")
        self.file_handle = None
        self.acquired = False
        self.holder_pid: int | None = None

    def acquire(self) -> bool:
        """Attempt to acquire non-blocking exclusive file lock. Return True if acquired, False if already held."""
        # 1. Environment check for multi-worker concurrency
        web_concurrency = os.environ.get("WEB_CONCURRENCY", "1").strip()
        try:
            if int(web_concurrency) > 1:
                log.error("WEB_CONCURRENCY=%s > 1 detected; agents bus is strictly single-process", web_concurrency)
                return False
        except ValueError:
            pass

        resolved = self.lock_path.resolve()
        if resolved in _held_locks:
            self.acquired = False
            self.holder_pid = os.getpid()
            return False

        self.lock_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            if not self.lock_path.exists():
                self.lock_path.touch()
            self.file_handle = open(self.lock_path, "r+", encoding="utf-8")
        except OSError as exc:
            # File is locked at OS level by another process
            self.holder_pid = self._read_holder_pid()
            log.error(
                "Agents already running in PID %s; run uvicorn with --workers 1. Multi-worker split-brain prevented.",
                self.holder_pid or "unknown",
            )
            return False

        # Apply OS-level non-blocking exclusive lock
        try:
            if sys.platform == "win32":
                import msvcrt
                self.file_handle.seek(0)
                msvcrt.locking(self.file_handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.file_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)

            # Acquired successfully -> record current PID
            _held_locks.add(resolved)
            self.acquired = True
            self.holder_pid = os.getpid()
            try:
                self.pid_path.write_text(str(self.holder_pid), encoding="utf-8")
            except Exception:
                pass
            return True

        except (OSError, IOError):
            # Lock is held by another process
            self.acquired = False
            self.holder_pid = self._read_holder_pid()
            log.error(
                "Agents already running in PID %s; run uvicorn with --workers 1. Multi-worker split-brain prevented.",
                self.holder_pid or "unknown",
            )
            try:
                self.file_handle.close()
            except Exception:
                pass
            self.file_handle = None
            return False

    def _read_holder_pid(self) -> int | None:
        try:
            if self.pid_path.exists():
                text = self.pid_path.read_text(encoding="utf-8").strip()
                return int(text) if text.isdigit() else None
        except Exception:
            pass
        return None

    def release(self) -> None:
        """Release OS lock and close file handle."""
        if not self.acquired or not self.file_handle:
            return

        try:
            if sys.platform == "win32":
                import msvcrt
                self.file_handle.seek(0)
                msvcrt.locking(self.file_handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.file_handle.fileno(), fcntl.LOCK_UN)
        except Exception as exc:
            log.debug("Error unlocking file: %s", exc)

        try:
            self.file_handle.close()
        except Exception:
            pass

        _held_locks.discard(self.lock_path.resolve())
        self.file_handle = None
        self.acquired = False
        try:
            if self.pid_path.exists():
                self.pid_path.unlink(missing_ok=True)
            if self.lock_path.exists():
                self.lock_path.unlink(missing_ok=True)
        except Exception:
            pass
