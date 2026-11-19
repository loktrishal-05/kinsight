"""Bounded reads of the FHIR R4 resources used by the synthetic import."""

import json

from fhir.resources.R4B.bundle import Bundle
from fhir.resources.R4B.diagnosticreport import DiagnosticReport
from fhir.resources.R4B.observation import Observation
from fhir.resources.R4B.patient import Patient
from fhir.resources.R4B.servicerequest import ServiceRequest
from fhir.resources.R4B.task import Task

MAX_BYTES = 262_144
MODELS = {model.get_resource_type(): model for model in (Bundle, DiagnosticReport, Observation, Patient, ServiceRequest, Task)}


def read_json(client, path, *, params=None, body=None):
    with client.stream("GET" if body is None else "POST", path, params=params, json=body) as response:
        response.raise_for_status()
        data = bytearray()
        for chunk in response.iter_bytes():
            if len(data) + len(chunk) > MAX_BYTES:
                raise ValueError("FHIR response exceeds the preview limit")
            data.extend(chunk)
    resource = json.loads(data)
    if not isinstance(resource, dict) or resource.get("resourceType") not in MODELS:
        raise ValueError("Unexpected FHIR resource type")
    # fhir.resources exposes R4B models for this shared subset. Keep the original
    # JSON for source IDs and exact version comparison.
    MODELS[resource["resourceType"]].model_validate(resource)
    return resource
