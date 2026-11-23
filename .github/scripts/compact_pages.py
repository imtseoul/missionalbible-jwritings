#!/usr/bin/env python3
"""Compact JSON formatting without changing tokens, records, files, or URLs."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path

TOKENS = re.compile(rb'"(?:[^"\\]|\\[\s\S])*"|[ \t\r\n]+')

def compact_bytes(data):
    compact = TOKENS.sub(lambda match: match[0] if match[0].startswith(b'"') else b'', data) + b'\n'
    # Parsing validates both inputs; lexical compaction also preserves duplicate
    # keys, number spellings, escape sequences and every byte inside strings.
    if json.loads(data) != json.loads(compact):
        raise ValueError("JSON data changed during compaction")
    return compact

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def tracked_files(root):
    # Exclude repository tooling from the public deployment manifest.
    return sorted(p for p in root.rglob("*")
                  if p.is_file() and not any(part.startswith(".") for part in p.relative_to(root).parts))

def compact_site(root):
    root = root.resolve()
    files = tracked_files(root)
    before = sum(p.stat().st_size for p in files)
    catalogs = [p for p in files if p.name == "catalog.json"]
    manifest_path = root / "deployment-manifest.json"
    changed = set()
    records = 0

    def save(path, data):
        if path.read_bytes() != data:
            temp = path.with_name(path.name + ".compacting")
            temp.write_bytes(data)
            temp.replace(path)
            changed.add(path.relative_to(root).as_posix())

    # Catalogs and the manifest are processed last because they hash data files.
    data_files = [p for p in files if p.suffix in (".json", ".jsonl")
                  and p not in catalogs and p != manifest_path]
    for number, path in enumerate(data_files, 1):
        if path.is_symlink():
            raise ValueError("Refusing to alter a symbolic link: " + str(path))
        if path.suffix == ".json":
            save(path, compact_bytes(path.read_bytes()))
        else:
            temp = path.with_name(path.name + ".compacting")
            with path.open("rb") as source, temp.open("wb") as dest:
                for line in source:
                    if line.strip():
                        dest.write(compact_bytes(line))
                        records += 1
                    else:
                        # Preserve blank record separators if any are present.
                        dest.write(line)
            if digest(path) == digest(temp):
                temp.unlink()
            else:
                temp.replace(path)
                changed.add(path.relative_to(root).as_posix())
        if number % 200 == 0:
            print(f"Validated {number}/{len(data_files)} JSON/JSONL files", flush=True)

    def local_path(base, value):
        if "://" in value or value.startswith("//"):
            raise ValueError("Expected a local catalog path: " + value)
        path = (root / value.lstrip("/")) if value.startswith("/") else (base / value)
        path = path.resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError("Catalog target is missing: " + str(path))
        return path

    hash_checks = 0
    for path in catalogs:
        catalog = json.loads(path.read_bytes())
        base = path.parent
        for collection in ("works", "supplementary_works"):
            for work in catalog.get(collection, []):
                if "json_sha256" in work:
                    work["json_sha256"] = digest(local_path(base, work["json_path"]))
                    hash_checks += 1
        for key in ("passage_index", "supplementary_passage_index", "search_index"):
            index = catalog.get(key)
            if isinstance(index, dict) and "sha256" in index and "path" in index:
                index["sha256"] = digest(local_path(base, index["path"]))
                hash_checks += 1
        save(path, json.dumps(catalog, ensure_ascii=False, separators=(",", ":")).encode() + b"\n")

    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_bytes())
        for name in manifest["files"]:
            path = local_path(root, name)
            manifest["files"][name] = digest(path)
            hash_checks += 1
        save(manifest_path, json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode() + b"\n")

    after_files = tracked_files(root)
    if [p.relative_to(root) for p in files] != [p.relative_to(root) for p in after_files]:
        raise ValueError("The public file inventory changed")
    after = sum(p.stat().st_size for p in after_files)
    if after > before:
        raise ValueError("Compaction increased the deployment size")
    report = dict(before_bytes=before, after_bytes=after, saved_bytes=before-after,
                  saved_percent=round(100*(before-after)/before, 2) if before else 0,
                  changed_files=len(changed), validated_data_files=len(data_files),
                  validated_jsonl_records=records, refreshed_hashes=hash_checks,
                  preserved_public_files=len(files), preserved_releases=len(catalogs)-1)
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as dest:
            dest.write("## Lossless Pages compaction\n\n")
            for key, value in report.items():
                dest.write(f"- {key}: {value}\n")
    return report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=".")
    args = parser.parse_args()
    compact_site(Path(args.root))
