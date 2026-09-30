# POA&M Generator

A free tool for building a real **Plan of Action & Milestones** against NIST SP 800-171 Rev. 2. Turn your open requirements into an owned, dated, actionable plan you can paste into your System Security Plan.

**Live tool:** https://nehemiah313.github.io/poam-generator/

## What it does

- **Imports your gaps** from the [SPRS Score Calculator](https://github.com/nehemiah313/sprs-score-calculator) automatically (same browser), or pick requirements by hand
- **Blocks the never-deferrable six** (3.1.20, 3.1.22, 3.10.3, 3.10.4, 3.10.5, 3.12.4) from the POA&M with a plain explanation: they must be implemented, not planned
- **Flags 3.12.4**: without a System Security Plan, no assessment can be completed at all
- Orders everything in **MAPS priority**: 5-point requirements first
- Suggests staggered completion dates (aggressive, steady, or relaxed) with per-item owners, resources, milestones, and status
- Exports a **CSV** for tracking and a **Markdown POA&M document** ready for your SSP appendix
- Your plan never leaves your browser (localStorage only, nothing uploaded)

## Honest framing, built in

- A POA&M does **not** change your SPRS score. The tool says so on screen and in the export.
- Suggested dates are labeled as suggestions. A missed POA&M date is worse than a later honest one.

## The dataset

Runs on the same machine-readable NIST SP 800-171 dataset as the calculator:

- [`data/nist-800-171-controls.json`](data/nist-800-171-controls.json)
- [`data/nist-800-171-controls.csv`](data/nist-800-171-controls.csv)

Requirement text: NIST SP 800-171 Rev. 2 (public domain). Free to reuse under MIT.

## Built by

**Neo Harvard**, CEO of [AI Tech Pros](https://aitechpros.ai) — SPRS and CMMC readiness for defense contractors. Part of the [MAPS framework](https://github.com/nehemiah313/maps-framework) family: Map, Assess, Prioritize, Sustain.
