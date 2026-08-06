"""Recruiter entrypoint. One cycle per run (cron) or loop forever.

Usage:
    python -m recruiter.main --mode scheduled
    python -m recruiter.main --mode forever --interval 3600
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import traceback

from . import pipeline, store


def run_scheduled() -> int:
    state = store.load()
    try:
        pipeline.run_cycle(state)
    finally:
        store.save(state)
    return 0


def run_forever(interval_seconds: int) -> int:
    while True:
        state = store.load()
        try:
            pipeline.run_cycle(state)
        except Exception as e:
            store.journal({"type": "cycle_exception", "error": repr(e)})
            traceback.print_exc()
        finally:
            store.save(state)
        print(f"[recruiter] cycle done, sleeping {interval_seconds}s", flush=True)
        time.sleep(max(1, interval_seconds))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="recruiter")
    parser.add_argument(
        "--mode",
        choices=("scheduled", "forever"),
        default=os.environ.get("RECRUITER_MODE", "scheduled"),
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=int(os.environ.get("RECRUITER_INTERVAL_SECONDS", "3600")),
        help="Seconds between cycles in forever mode (default 3600 = hourly).",
    )
    args = parser.parse_args(argv)

    if args.mode == "scheduled":
        return run_scheduled()
    return run_forever(args.interval)


if __name__ == "__main__":
    sys.exit(main())
