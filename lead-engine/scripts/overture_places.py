#!/usr/bin/env python3
"""Pull business listings from Overture Maps Places (free, CDLA Permissive 2.0)
for one job's bounding box and write them to a JSON file for src/sources/overture.js.

Usage: python3 scripts/overture_places.py --job houston --out /tmp/overture-houston.json
Needs: pip install duckdb. Reads the public s3://overturemaps-us-west-2 bucket, no account.
Prints counts only, never rows (the repo is public).
"""
import argparse, json, os, re, sys, urllib.request

BUCKET = "overturemaps-us-west-2"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def latest_release():
    if os.environ.get("OVERTURE_RELEASE"):
        return os.environ["OVERTURE_RELEASE"]
    url = f"https://{BUCKET}.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/"
    xml = urllib.request.urlopen(url, timeout=30).read().decode()
    releases = re.findall(r"<Prefix>release/([0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+)/</Prefix>", xml)
    if not releases:
        sys.exit("No Overture releases found")
    return sorted(releases)[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--job", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--min-confidence", type=float, default=0.6)
    a = ap.parse_args()

    jobs = json.load(open(os.path.join(ROOT, "config/jobs.json")))
    job = jobs[a.job]
    xmin, ymin, xmax, ymax = job["overture_bbox"]
    release = latest_release()

    import duckdb
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET s3_url_style='path';")
    src = f"read_parquet('s3://{BUCKET}/release/{release}/theme=places/type=place/*', hive_partitioning=1)"
    cols = {r[0] for r in con.execute(f"DESCRIBE SELECT * FROM {src}").fetchall()}
    status = "AND coalesce(operating_status, 'open') <> 'permanently_closed'" if "operating_status" in cols else ""
    rows = con.execute(f"""
        SELECT id,
               names.primary AS name,
               categories.primary AS category,
               confidence,
               phones[1] AS phone,
               websites[1] AS website,
               emails[1] AS email,
               addresses[1].freeform AS address,
               addresses[1].locality AS city,
               addresses[1].postcode AS postcode,
               addresses[1].region AS region
        FROM {src}
        WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?
          AND addresses[1].region = 'TX'
          AND confidence >= ?
          AND (phones[1] IS NOT NULL OR websites[1] IS NOT NULL)
          {status}
    """, [xmin, xmax, ymin, ymax, a.min_confidence]).fetchall()
    keys = ["id", "name", "category", "confidence", "phone", "website", "email", "address", "city", "postcode", "region"]
    data = [dict(zip(keys, r)) for r in rows]
    with open(a.out, "w") as f:
        json.dump({"release": release, "job": a.job, "places": data}, f)
    print(json.dumps({"overture_release": release, "job": a.job, "places": len(data)}))


if __name__ == "__main__":
    main()
