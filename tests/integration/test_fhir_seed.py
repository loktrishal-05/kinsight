import os

import httpx
import pytest

from scripts.export_fhir_bundles import MEDIA, TAG, build_bundles, upload
from services.api.routes.fhir_preview import read_preview
from services.cohort.panel import load_panel


def test_transactions_are_reproducible_and_link_findings_to_the_right_patient():
    bundles, correction = build_bundles()
    assert (bundles, correction) == build_bundles()
    assert len(bundles) == 2
    seen = {}
    for _, bundle in bundles:
        assert bundle["meta"]["tag"] == [TAG]
        resources = {item["request"]["url"]: item["resource"] for item in bundle["entry"]}
        assert len(resources) == len(bundle["entry"])
        patients = {key for key, value in resources.items() if value["resourceType"] == "Patient"}
        assert len(patients) == 2
        for url, resource in resources.items():
            assert url == f"{resource['resourceType']}/{resource['id']}"
            assert resource["meta"]["tag"] == [TAG]
            if resource["resourceType"] == "DiagnosticReport":
                assert resource["subject"]["reference"] in patients
                assert resource["result"]
                for finding in resource["result"]:
                    assert resources[finding["reference"]]["subject"] == resource["subject"]
            if resource["resourceType"] in {"RelatedPerson", "Consent"}:
                assert resource["patient"]["reference"] in patients
            if resource["resourceType"] == "Consent":
                assert resource["status"] == "draft"
        assert seen.keys().isdisjoint(resources)
        seen.update(resources)
    for item in correction["entry"]:
        original = seen[item["request"]["url"]]
        assert item["resource"]["status"] == "corrected"
        assert original["status"] == "final"
        assert item["resource"]["subject"] == original["subject"]
    changed = correction["entry"][0]
    assert changed["resource"]["valueCodeableConcept"] != seen[changed["request"]["url"]]["valueCodeableConcept"]


def test_hapi_accepts_seed_and_keeps_the_report_identity_on_correction():
    base = os.environ.get("KINSIGHT_FHIR_TEST_URL")
    if not base:
        pytest.skip("Set KINSIGHT_FHIR_TEST_URL to a disposable HAPI R4 instance")
    bundles, correction = build_bundles()
    with httpx.Client(base_url=base.rstrip("/") + "/", timeout=60, headers={"accept": MEDIA, "content-type": MEDIA}) as client:
        upload(client, bundles)
        report_path = correction["entry"][-1]["request"]["url"]
        original = client.get(report_path).raise_for_status().json()
        panel = load_panel()
        preview = read_preview(client, original["id"], panel)
        assert preview["version"] == original["meta"]["versionId"]
        patient = original["subject"]["reference"]
        unrelated = bundles[1][1]["entry"][0]["request"]["url"]

        for subject in (patient, unrelated):
            query = client.get("DiagnosticReport", params={"subject": subject}).raise_for_status().json()
            reports = [item["resource"] for item in query.get("entry", [])]
            assert len(reports) == 1
            assert reports[0]["subject"]["reference"] == subject
            assert (reports[0]["id"] == original["id"]) is (subject == patient)
        upload(client, [("correction", correction)], require_existing=True)

        revised = client.get(report_path).raise_for_status().json()
        assert revised["status"] == "corrected"
        assert revised["id"] == original["id"]
        assert revised["meta"]["versionId"] != original["meta"]["versionId"]
        corrected = read_preview(client, original["id"], panel)
        assert corrected["version"] == revised["meta"]["versionId"]
        assert corrected["state"] == "requires_review"
        assert len(corrected["findings"]) == len(preview["findings"]) - 1
        assert revised["result"] == original["result"]
        history_path = f"{report_path}/_history/{original['meta']['versionId']}"
        assert client.get(history_path).raise_for_status().json()["status"] == "final"
        for item in correction["entry"]:
            current = client.get(item["request"]["url"]).raise_for_status().json()
            assert current["status"] == "corrected"
        assert client.get(f"DiagnosticReport/{unrelated.split('/')[1]}").raise_for_status().json()["status"] == "final"
        with pytest.raises(ValueError, match="requires a seeded final resource"):
            upload(client, [("correction", correction)], require_existing=True)
