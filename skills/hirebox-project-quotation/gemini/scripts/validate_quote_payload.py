#!/usr/bin/env python3
"""Validate the structured input used by the Hirebox project quotation skill."""

import argparse
import json
from pathlib import Path


REQUIRED_ROOT = ("client_name", "project_name", "quote_date", "currency", "modules")
REQUIRED_MODULE = ("id", "name", "scope", "price", "unit", "payment_terms")


def fail(message):
    raise SystemExit(f"INVALID: {message}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("payload", type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.payload.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        fail(f"cannot read JSON: {exc}")
    if not isinstance(data, dict):
        fail("root must be an object")
    for field in REQUIRED_ROOT:
        if not data.get(field):
            fail(f"missing required field: {field}")
    if data.get("pricing_mode", "additive") not in {"additive", "alternative", "mixed"}:
        fail("pricing_mode must be additive, alternative, or mixed")
    modules = data["modules"]
    if not isinstance(modules, list) or not modules:
        fail("modules must be a non-empty array")
    seen = set()
    for index, module in enumerate(modules, start=1):
        if not isinstance(module, dict):
            fail(f"module {index} must be an object")
        for field in REQUIRED_MODULE:
            if not module.get(field):
                fail(f"module {index} missing required field: {field}")
        if module["id"] in seen:
            fail(f"duplicate module id: {module['id']}")
        seen.add(module["id"])
    print(f"VALID: {len(modules)} module(s); pricing_mode={data.get('pricing_mode', 'additive')}")


if __name__ == "__main__":
    main()
