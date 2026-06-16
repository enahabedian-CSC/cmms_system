# DOCUMENT_REGISTER_CONFORMANCE.md — Module 9

**Round:** SQF Workstream & Regression-Restore — branch `Claude-changes` — Date: 2026-06-16
**Authorities (read-only):** SQF Reference Master `1WZOuC5…` (CSC Maintenance SQF Document Register, PRO-029/PRO-030 scope) and the Maintenance Document Register / SQF Reference Index Master `1-chsMYMeOO…`.
**Purpose:** reconcile the documents the CMMS produces against the **existing** register. No register was invented. This is a report, not a schema change.

---

## 1. App documents reconciled to the register (after this round)

| Register doc # | Document | App location | Build status now | Doc-control wired? |
|---|---|---|---|---|
| FRM-030-001 | Master Equipment Register | Equipment Inventory | Built (pre-existing) | n/a this round |
| **FRM-030-002** | Maintenance Repair Log | Closed Tickets tab | **Built — R3 restored data source** | ✅ `docLabel('repairLog')` |
| **FRM-030-003** | Maintenance Repair Record | Service Report → print | **Built — # corrected from FRM-040-002; clearance + fields added** | ✅ `docLabel('serviceReport')` |
| (embedded) | Maintenance Repair Clearance | Section of FRM-030-003 | **Built — embedded (Flag 3 resolved: embedded)** | inherits FRM-030-003 |
| (unnumbered) | Maintenance Activity / **Temporary Repair Log** | Temp Fix Monitor | **Data matched (M7); number deferred** | pending # (see §3) |
| **FRM-029-002** | Equipment Quality Hold Tag | Hold-tag print | **Built — auditor form ported, printable** | ✅ `docLabel('holdTag')` |
| **FRM-029-001** | Non-Conforming Equipment Register | Equipment Hold Log | **Partial — register view + label; full field set pending** | ✅ `docLabel('ncrRegister')` |

---

## 2. Documents the register lists that the app still LACKS (gaps)

These are register rows not (fully) satisfied by the CMMS. **None invented; all from the SQF Reference Master Document Register.** Out of scope for this round per the charter; reported for backlog.

| Register doc | Source clause | Register status | App gap | Notes |
|---|---|---|---|---|
| Master Preventative Maintenance Schedule (FRM-030-002 *disputed*) | 2.2.4.x, 2.5 | Not Built | No PM module | Deferred (PM module is a later round). Number collision resolved (Flag 1): Repair Log keeps 030-002; Schedule needs a fresh number. |
| FRM-030-### PM Forms (per department) | 2.2.4.11, 2.5.1 | Open | No PM forms | Tied to PM module. |
| Downtime Review / Completion-Rate Record | 2.17.1-.4 | Open | No dedicated record | Cadence conflict unresolved (Flag 4). Dashboard surfaces some data but not the controlled record. |
| Equipment Approval Procedure | 2.2.3, 2.15.1 | Open | None | Procedure (not a form); needs PRO/SOP number — Michael + Compliance (Flag 9). |
| 3rd-Party Service Record System | 2.1.2, 2.16.2 | Open | None | Forklift/chillers/leased equipment service records (Flag 10). |
| FRM-029-001 full field set | 2.3-2.6 | Not Built (partial now) | Missing register fields | Root-cause→CAPA ref (2.4.2), disposition + authorized-by (2.5.2-.3), tag color, release block detail — see SQF_COVERAGE_MATRIX §E. |

**Quality-owned, LINK-ONLY (correctly NOT built here):** FRM-017-001 / FRM-017-002 (CAPA), FRM-031-001 / SOP-031-002 (Calibration). The app links to these (a hold/CAPA relationship) but does not author them. ✅ conformant.

---

## 3. FRM-040 series reconciliation (the flagged item)

The app uses an **FRM-040-xxx** series that does **not appear in the Maintenance Document Register** (PRO-029/PRO-030 scope):

| App number | Where | Register status | Resolution |
|---|---|---|---|
| ~~FRM-040-002~~ → **FRM-030-003** | Service Report (Maintenance Repair Record) | Corrected this round | ✅ done (R1/M5/M8) |
| ~~FRM-040-001~~ → **FRM-030-004** | Ticket submission form (`TicketSubmission.gs:35`, config `Doc No (Ticket Form)`, `DOC_CONTROL.ticketForm`) | Moved into the 030 series | ✅ **Resolved (Michael 6/16):** FRM-040-001 was a mistaken number; ticket form now displays **FRM-030-004** (safe placeholder until an official number is assigned). Config-overridable via `Doc No (Ticket Form)`. |

**No FRM-040 numbers are emitted by the app any longer** (the only remaining `FRM-040` reference is a historical code comment in `ServiceReport.gs` documenting the correction). The FRM-030-004 placeholder can be changed to the official number via the Configuration tab with no code edit when Compliance assigns it.

---

## 4. Net conformance posture after this round

- **Built & conformant (maintenance-owned, in register):** FRM-030-001, FRM-030-002, FRM-030-003 (+ embedded Clearance), FRM-029-002.
- **Partial:** FRM-029-001 (register view + label present; full NCR field set pending), Temporary Repair Log (data matched; number pending).
- **Open / later round:** PM Schedule + PM forms, Downtime Review record, Equipment Approval Procedure, 3rd-party service records.
- **Link-only (not ours):** FRM-017, FRM-031.
- **Numbering corrected:** Service Report now FRM-030-003 everywhere (no FRM-040-002 / FRM-003-003 remnants in printed output).

**Decisions still owed by Michael/Compliance:** Temp Repair Log number (§3 / M7), FRM-040-001 ticket-form disposition (§3), plus open SQF flags 3-handled / 4 / 5 / 9 / 10 tracked in SQF_COVERAGE_MATRIX §G.
