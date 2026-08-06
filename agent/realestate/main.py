"""Real estate agent entrypoint.

Usage:
    python -m agent.realestate.main --mode scheduled
    python -m agent.realestate.main --mode forever --interval 900
"""
from __future__ import annotations

import argparse
import os
import sys
import traceback

from . import brain, memory


def run_scheduled() -> int:
    state = memory.load()
    try:
        brain.run_re_cycle(state, mode="scheduled")
    finally:
        memory.save(state)
    return 0


def run_forever(interval_seconds: int) -> int:
    while True:
        state = memory.load()
        try:
            brain.run_re_cycle(state, mode="forever")
        except Exception as e:
            memory.journal({"type": "re_cycle_exception", "error": repr(e)})
            traceback.print_exc()
        finally:
            memory.save(state)
        print(f"[re-agent] cycle done, sleeping {interval_seconds}s", flush=True)
        brain.sleep_with_jitter(interval_seconds)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="re-agent")
    parser.add_argument(
        "--mode",
        choices=("scheduled", "forever"),
        default=os.environ.get("RE_AGENT_MODE", "scheduled"),
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=int(os.environ.get("RE_AGENT_INTERVAL_SECONDS", "900")),
    )
    args = parser.parse_args(argv)
    if args.mode == "scheduled":
        return run_scheduled()
    return run_forever(args.interval)


if __name__ == "__main__":
    sys.exit(main())
