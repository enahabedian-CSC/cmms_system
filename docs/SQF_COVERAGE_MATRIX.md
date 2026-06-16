# SQF_COVERAGE_MATRIX.md — Keystone #2

**Round:** SQF Workstream & Regression-Restore — **branch `Claude-changes`** — **Date: 2026-06-16**
**Sources of truth (read-only):**
- SQF Reference Master — `1WZOuC5vBD5a56umfDCl6gyLFJMMej6OnpI4kORgEk8k` (tabs: Document Register, Field Specifications, Open Items & Flags)
- Maintenance Document Register / SQF Reference Index Master — `1-chsMYMeOO86tVa2IRm2irJv2Ii5XQKn4OgDIZ7XTuI`

**Legend:** ✅ present · ⚠️ partial/degraded · ❌ missing · 🔒 link-only (Quality-owned, not ours to build)

---

## A. DOCUMENT-LEVEL COVERAGE (the build backlog)

| Doc # | Document | Lives in (CMMS) | Register build status | Web-app status today | Gap |
|---|---|---|---|---|---|
| FRM-030-001 | Master Equipment Register | Equipment Inventory | Built | ✅ Equipment inventory present (`EquipRegistry.gs`) | conformant for this round |
| **FRM-030-002** | **Maintenance Repair Log** | **Closed Tickets tab** | Built | ⚠️ Header stamped `FRM-030-002` (`closed-tickets.html:73`) **but tab returns empty** | **R3 regression** |
| **FRM-030-003** | **Maintenance Repair Record** | **Service Report → PDF** | Built | ⚠️ Exists but stamped **`FRM-040-002`** (`ServiceReport.gs:44`, `ticket-detail.html:681`) + **no PDF-to-Drive** | **doc# wrong + R1 regression** |
| (TBD) | Maintenance Repair Clearance | Section of 030-003 | Partial | ❌ Post-Repair Clearance block absent from service report | build step 5 |
| (TBD, unnumbered) | Maintenance Activity / **Temporary Repair Log** | Temp Fix Monitor | Built (unnumbered) | ⚠️ Capture partial; several SQF fields missing | build step 7 |
| **FRM-029-001** | **Non-Conforming Equipment Register** | Equipment Hold Log | Not Built | ⚠️ Backend read/write exists (`MonitoringViews.gs`), no register view/fields | build step 4 |
| **FRM-029-002** | **Equipment Quality Hold Tag** | Hold-tag PDF | Partial (auditor-approved) | ⚠️ Backend exists; **auditor-approved form never ported** (stripped inline modal) | build step 4 — see `HOLD_TAG_DIAGNOSIS.md` |
| FRM-017-001 / -002 | CAPA Form / Register | Quality system | Built | 🔒 link-only — **do not author** | Flag 7: universal CAPA |
| FRM-031-001 / SOP-031-002 | Calibration | Quality | N/A | 🔒 may surface read-only | not ours |

---

## B. FIELD-LEVEL COVERAGE — FRM-030-003 Maintenance Repair Record
Field list = SQF Reference Master, Field Specifications tab. Web-app columns from `Config.gs` RDB map + `ServiceReport.gs` + `ticket-detail.html` service-report modal.

| Required field (clause) | R/C | Izzy ref | Web-app backend (RDB col) | Web-app modal | Status |
|---|---|---|---|---|---|
| Record / Work-Order ID (implied) | R | ticket # | uses Ticket No | — | ⚠️ uses Ticket # as WO ID |
| Asset ID + physical location (2.16.2/2.2.4) | R | ✅ | Equip Code (7) + Building/Zone (5) | `ticket-detail.html:712–714` | ✅ |
| Department (implied) | R | ✅ | col 4 | `:710` | ✅ |
| Date of service (2.16.2) | R | ✅ | SERVICE_DATE (29) | not in modal | ⚠️ in schema, not captured in modal |
| Priority (2.10.4/2.2.4.15) | R | ✅ | col 23 | `:723` auto | ✅ |
| Problem / fault description (implied) | R | ✅ | col 9 | `:715` | ✅ |
| Work performed (2.16.2) | R | ✅ | WORK_SUMMARY (13) | `:719` | ✅ |
| Corrective actions (2.16.2) | R | ✅ | CORRECTIVE_ACT (11) | `:717` | ✅ |
| Parts ordered (2.10.4) | C | ✅ table | PARTS_USED (16) | `:720` text | ⚠️ table → free text |
| Recommendations (2.16.2) | C | ✅ | RECOMMENDATIONS (31) | not in modal | ⚠️ schema only |
| Technician / service provider (2.16.2) | R | ✅ | COMPLETED_BY (19) | `:721` | ✅ |
| **Restricted-activity flag** (2.4.1) | C | ❌ | conflated w/ TEMP_FIX_FLAG (15) | — | ❌ **no true restricted-activity flag** |
| **Post-Repair Clearance block** (2.14.3) | R | partial (mgr verify) | VERIFIED_BY/DATE (20/21) only | not in modal | ❌ **clearance checklist absent** |
| **Facility-contact signature + date** (2.14.4) | R | ⚠️ | VERIFIED_BY/DATE (20/21) | not in modal | ⚠️ verifier ≠ facility-contact sign-off |

**Post-Repair Clearance sub-fields required (2.14.3, all ❌ today):** maintenance complete Y/N (2.14.3.1) · all tools removed Y/N (2.14.3.2) · area cleaned & sanitized / no residual lubricants Y/N (2.14.3.3) · sanitation/QA inspection required if restricted activity (2.13/2.4.1) · verification name + signature + date (2.14.4).

---

## C. FIELD-LEVEL COVERAGE — Three Completion Fields (build step 6, Flag 7)

| Field | Backend | Modal | Required today? | Required per Flag 7 |
|---|---|---|---|---|
| Corrective Action / Work Summary | `ServiceReport.gs:182`, RDB 11/13 | `ticket-detail.html:690` | ❌ only Problem Desc validated (`:705`) | **R — every ticket, all priorities** |
| Root Cause | `:180`, RDB 10 | `:688` | ❌ not enforced | **R — all priorities** |
| Preventative Action | `:183`, RDB 12 | `:692` | ❌ not enforced | **R — all priorities** |

**Finding:** all three fields *exist and persist*, but **none are required** and there is **no priority gate** currently (the prior High/Critical-only conditional is not even enforced in this build — only Problem Description is validated at `ticket-detail.html:705`). Flag 7 (SQF Reference Master, RESOLVED) mandates **universal CAPA — all non-conformances, every priority**. Build step 6 makes all three required on every ticket and displayed on detail after completion.

---

## D. FIELD-LEVEL COVERAGE — Temporary Repair Log (Temp Fix Monitor, build step 7)
Required fields = SQF Reference Master "Maintenance Activity / Temporary Repair Log" rows.

| Required field (clause) | R/C | Web-app TF schema (`Config.gs:275–288`) | Status |
|---|---|---|---|
| Entry/Temp ID (implied) | R | TEMP_ID (1) | ✅ |
| Asset ID + location (implied) | R | EQUIP_CODE (3) + BUILDING_ZONE (6) | ✅ |
| Date temp repair made (2.10.3) | R | DATE_FLAGGED (7) | ✅ |
| Temporary-repair description (2.10.3) | R | TEMP_FIX_DESC (9) | ⚠️ stored, not surfaced in an inspection form |
| Reason fix is temporary (2.10.4) | R | DESCRIPTION (8) | ⚠️ ambiguous mapping |
| **Permanent-fix plan / WO ref (2.10.4)** | R | — | ❌ **missing** |
| Parts ordered (2.10.4) | C | — | ❌ |
| Priority (2.10.4) | R | (from ticket) | ⚠️ not on TF row |
| **Expected completion date (Mike's tab)** | R | NEXT_DUE (12) is inspection-due, not completion | ❌ **no user-entered completion date** |
| Weekly follow-up log (2.10.5–.6) | R | LAST_INSPECTED (11) | ⚠️ no review-log capture |
| **No-improvised-materials confirmation (2.10.7)** | R | — | ❌ **missing** |
| **Product-risk confirmation (2.10.1)** | R | — | ❌ **missing** |

**Finding:** Temp Fix Monitor *reads* (`getTempFixItems`) but the auditor inspection workflow (`TempFixInspection.html` in Izzy's ref) was never ported; `getTempFixFormData`/`submitTempFixInspection` **do not exist** in `backend/`. Three required confirmations are wholly absent.

---

## E. FIELD-LEVEL COVERAGE — FRM-029-001 Non-Conforming Equipment Register & FRM-029-002 Hold Tag
See `HOLD_TAG_DIAGNOSIS.md` for root cause. Field gaps (register fields, clauses 2.3–2.6): hold authority (2.3.3), hold tag # + reference # (2.3.4), tag color (2.3.5), reason/identified risk (2.6.2), root-cause→CAPA ref (2.4.2 → FRM-017-001), disposition + authorized-by (2.5.2–.3), release date/released-by/what-was-done (2.6.3). Current inline modal captures only **tag type + reason** (`ticket-detail.html:654–655`).

Hold Tag (FRM-029-002) required text/fields (2.3): **"ON HOLD — not to be used until further notice"** (2.3.1), date on hold (2.3.2), hold authority (2.3.3), unique tag # + reference # (2.3.4), color (2.3.5), equipment ID/description, release block (2.6.3). Auditor-approved fields exist in Izzy's `EquipmentHoldTag.html` — to be ported intact + doc-control triplet added.

---

## F. DOCUMENT-CONTROL NUMBERING — conformance to the register

| Document | Register-mandated # | Number in code today | File:line | Verdict |
|---|---|---|---|---|
| Maintenance Repair Record (Service Report) | **FRM-030-003** | **FRM-040-002** ❌ | `ServiceReport.gs:44`, `ticket-detail.html:681` | **WRONG — must change to FRM-030-003** |
| Maintenance Repair Log (Closed Tickets) | **FRM-030-002** | FRM-030-002 ✅ | `closed-tickets.html:73`, `reports.html:165` | correct |
| Equipment Quality Hold Tag | **FRM-029-002** Rev 0 6/15/26 | none (no doc-control on hold tag) | `ticket-detail.html:645` | **missing — must stamp** |
| Non-Conforming Equipment Register | **FRM-029-001** | none | — | **missing** |
| Ticket submission form | *(not in maintenance register)* | FRM-040-001 | `TicketSubmission.gs:35` | not register-listed; raise with Michael |

### 🔴 KEY NUMBERING FINDING
The prompt's Flag 2 warned about `FRM-003-003`. The **actual deployed value is a third number — `FRM-040-002`** (`ServiceReport.gs:44`). Both are wrong; the register (and Section 7) mandate **FRM-030-003** for the Maintenance Repair Record. This must be corrected **before it propagates into the generated PDF header** (Flag 2 resolution). The `FRM-040-xxx` series is not present in the Maintenance Document Register at all — surface to Michael during Document Register conformance (build step 9).

---

## G. OPEN ITEMS & FLAGS (SQF Reference Master, Tab 3) — relevance to this round

| # | Flag | Status | Bearing on this round |
|---|---|---|---|
| 1 | FRM-030-002 collision (Repair Log vs PM Schedule) | **Resolved** | Keep Closed Tickets at FRM-030-002 ✅ (already correct). PM Schedule deferred. |
| 2 | FRM-003-003 vs FRM-030-003 | **Resolved** | Use **FRM-030-003**; fix code's `FRM-040-002` before PDF header. |
| 3 | Clearance: standalone vs embedded | **Open** | Build step 5 — **ask Michael** whether clearance is embedded in 030-003 or standalone. |
| 4 | Downtime review cadence (daily vs weekly) | Open | Out of scope this round (dashboard reorg adjacent only). |
| 5 | Two tags (029-002 vs 031 instrument tag) | Open | Hold-tag build uses **FRM-029-002**; do not reconcile 031. |
| 6 | SOP-031-002 title | Open | Quality-owned, not ours. |
| 7 | **CAPA scope — universal** | **Resolved** | **Drives build step 6** — three fields required on every priority. |
| 8 | PRO-017 / PRO-030 DRAFT | Open | Link-only; no action. |
| 9 | Equipment Approval Procedure undefined | Open | Not this round. |
| 10 | 3rd-party service records | Open | Not this round. |

---

## H. BUILD BACKLOG (grouped by document, gated behind Step-0 sign-off)
1. **FRM-030-003** — correct doc# `FRM-040-002`→`FRM-030-003`; add Post-Repair Clearance block + restricted-activity flag + facility-contact sign-off; surface Date-of-Service & Recommendations in capture. *(steps 5, 8)*
2. **FRM-030-002** — restore Closed Tickets data source (R3); header already correct. *(step 3)*
3. **FRM-029-002 + FRM-029-001** — port auditor hold tag + register fields; stamp doc-control. *(step 4)*
4. **Temporary Repair Log** — add permanent-fix plan/WO, expected completion date, no-improvised-materials & product-risk confirmations; assign number (ask Michael). *(step 7)*
5. **Three completion fields** — universal-required + display. *(step 6)*
6. **Doc-control triplet wiring** on every printable screen. *(step 8)*
7. **Document Register conformance** report (`FRM-040-xxx` series reconciliation). *(step 9)*
