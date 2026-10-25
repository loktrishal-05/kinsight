PY ?= python
.PHONY: test lint cohort demo up
test:
	$(PY) -m pytest -q
lint:
	$(PY) -m ruff check services tests
cohort:
	$(PY) scripts/make_demo_cohort.py
demo:
	$(PY) scripts/demo.py
up:
	docker compose up --build
