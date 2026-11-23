import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("compact_pages", Path(__file__).with_name("compact_pages.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CompactionTests(unittest.TestCase):
    def test_json_tokens_and_original_text_are_preserved(self):
        source = b' { "original": "a  b\\n\\t\\\\\\" c", "n":1e+20, "n":9007199254740993, "u":"\\uD55C" } '
        result = module.compact_bytes(source)
        self.assertEqual(result, b'{"original":"a  b\\n\\t\\\\\\" c","n":1e+20,"n":9007199254740993,"u":"\\uD55C"}\n')
        self.assertEqual(json.loads(source), json.loads(result))

    def test_invalid_json_is_rejected(self):
        with self.assertRaises(json.JSONDecodeError):
            module.compact_bytes(b'{"korean": "unfinished')

    def test_archives_catalog_hashes_records_and_idempotence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            main_work = {"passages": [{"id": "a", "original": "α  β", "korean": "희년  해방"}]}
            old_work = {"passages": [{"id": "a", "original": "α β", "korean": "이전 번역"}]}
            for base, work in [(root, main_work), (root / "releases/public-0.1", old_work)]:
                (base / "data/works").mkdir(parents=True)
                (base / "works").mkdir()
                (base / "works/index.html").write_text("<p>Immutable citation page</p>")
                (base / "data/works/a.json").write_text(json.dumps(work, ensure_ascii=False, indent=2))
                (base / "data/passages.jsonl").write_text(json.dumps(work["passages"][0], ensure_ascii=False) + "\n")
                (base / "catalog.json").write_text(json.dumps({
                    "works": [{"id": "a", "json_path": "data/works/a.json", "json_sha256": "old"}],
                    "passage_index": {"path": "data/passages.jsonl", "sha256": "old"}
                }, indent=2))
            (root / ".nojekyll").write_bytes(b"")
            (root / "CNAME").write_text("atexts.missionalbible.org\n")
            inventory = {p.relative_to(root).as_posix(): module.digest(p) for p in root.rglob("*") if p.is_file()}
            (root / "deployment-manifest.json").write_text(json.dumps({"files": inventory}, indent=2))
            report = module.compact_site(root)
            self.assertGreater(report["saved_bytes"], 0)
            self.assertEqual(report["preserved_releases"], 1)
            self.assertEqual(report["validated_jsonl_records"], 2)
            for base, work in [(root, main_work), (root / "releases/public-0.1", old_work)]:
                self.assertEqual(json.loads((base / "data/works/a.json").read_bytes()), work)
                self.assertEqual(json.loads((base / "data/passages.jsonl").read_bytes()), work["passages"][0])
                self.assertEqual((base / "works/index.html").read_text(), "<p>Immutable citation page</p>")
                catalog = json.loads((base / "catalog.json").read_bytes())
                self.assertEqual(catalog["works"][0]["json_sha256"], module.digest(base / "data/works/a.json"))
                self.assertEqual(catalog["passage_index"]["sha256"], module.digest(base / "data/passages.jsonl"))
            manifest = json.loads((root / "deployment-manifest.json").read_bytes())
            self.assertEqual(set(manifest["files"]), set(inventory))
            for path, sha in manifest["files"].items():
                self.assertEqual(sha, module.digest(root / path))
            self.assertEqual(module.compact_site(root)["changed_files"], 0)

if __name__ == "__main__":
    unittest.main()
