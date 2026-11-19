"""Refresh the public MedlinePlus gene and condition link indexes used by report comparison."""

import json
import re
from pathlib import Path
from urllib.request import urlopen
from xml.etree import ElementTree

SOURCE = "https://medlineplus.gov/download/TopicIndex.xml"
DESTINATION = Path(__file__).resolve().parents[1] / "web/lib/fixtures/medlineplus-topics.json"


def main():
    with urlopen(SOURCE, timeout=30) as response:
        catalogue = ElementTree.fromstring(response.read())  # noqa: S314  fixed NLM catalogue URL, maintainer-run
    links = {"gene": set(), "condition": set()}
    for node in catalogue.findall("topic/topics/topic/url"):
        match = re.fullmatch(r"https://medlineplus\.gov/genetics/(gene|condition)/([a-z0-9-]+)", node.text or "")
        if match:
            links[match[1]].add(match[2])
    if any(len(entries) < 1000 for entries in links.values()):
        raise ValueError("MedlinePlus changed the catalogue format or returned an incomplete index")
    DESTINATION.write_text(
        json.dumps({key: sorted(entries) for key, entries in links.items()}, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(", ".join(f"{len(entries)} {kind} links" for kind, entries in links.items()))


if __name__ == "__main__":
    main()
