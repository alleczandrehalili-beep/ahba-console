# QA additions — 13 October 2026

This feature release starts from the deployed console main, not the broader RC7 WIMS/queue branch. It adds two approved QA processes and preserves the currently deployed return workflow.

## Dispatcher photo correction

Open a JO's photos and choose **Replace this photo** on the specific wrong image. Select JPG, PNG or WebP (up to 10 MB), enter the reason, and save. The original and replacement remain in private correction history with the dispatcher and time. The selected photo row keeps its id and label. A validated job becomes Pending QA. Payment, crew, stock, completion and QA return state do not change. Use **History** to inspect before/after evidence.

Permissions come from trusted organization membership and dispatcher view/edit rights on the server. Stale photo paths and stale return tokens are refused. A retry of the same operation returns the saved result. Corrected evidence cannot be overwritten by an old client, and QA validation compares the current gallery.

## WIMS on the same QA Validation sheet

The existing archive export keeps its **Completed** worksheet and appends WIMS declaration columns: original technician/team, filed date, task, modem/IPTV serials, kit/materials, FOC reels/readings, pulled devices, remarks and warnings. No extra viewing sheet is introduced.

The existing server has legacy receipts without saved job ids. Display a receipt only if its JO/ticket and nonblank customer account identify exactly one retained job generation, including deleted jobs. Ambiguous/unmatched evidence is labeled for review; another customer's payload is withheld. Export does not bind declarations or change stock. Material quantities are filed evidence, not recalculated inventory totals.

## Deployment and continuity

Deploy qa-07a, qa-07b and the qa-replace-photo Edge service before this frontend. QA API schema must already be exposed. The new service requires the existing hosted Auth credentials and QA_PHOTO_ALLOWED_ORIGINS=https://console.ahbadevt.com. Gateway JWT verification stays enabled, and the handler verifies the current user through Auth before calling permission-checked RPCs.

The migrations use a 2-second lock acquisition timeout. They do not install qa-06 or change existing WIMS filing functions, mobile files, queues, attendance or dispatch logic. Existing tabs remain open. Save current work and use the optional update prompt or reopen the console to use the added controls.

Verification: 66 Node tests, disposable legacy PostgreSQL suites with red/green regressions, frontend deployment checks, and hosted integration using isolated synthetic Auth/JO fixtures. Hosted tests exercise real private Storage and signed history, retry, preserved financial/return state, exact-gallery validation, anonymous denial, export and ordinary job updates. The synthetic jobs are archived and test logins removed; append-only QA logs and immutable test photo evidence are retained.

Recovery: revert only the frontend feature commit if necessary. Retain corrected evidence, immutable archives and their protection. Do not run the broader qa-06 rollback or downgrade to a client that silently validates corrected photos without the current-gallery check.

The broader RC7 receipt/generation/queue audit remains on hold. This release does not certify its fixes or make historical stock adjustments. Real device and production-load behavior cannot be guaranteed from a test suite; no forced reload or queue reset is used.

## Usage-focused report correction — version 2026-10-13.3

The Completed worksheet now puts WO/JO identity beside the actual declared usage. Modem/IPTV serial numbers and reel numbers are plain values; reel meter readings, FOC used, each kit item and each drop material have separate numeric columns with units. Serial/reel case is preserved exactly. The sheet uses fitted widths, wrapped colored headers, row heights and filters. Internal receipt/audit details remain available in hidden columns at the far right.

Kit quantities already include buffer excess for the standard kit items. Buffer quantities are shown separately and explicitly must not be added again. Missing quantities stay blank, declared zero stays numeric zero, and multiple active declarations stay on one JO row with separate D1/D2 values rather than summed usage or duplicated payments. Unconfirmed/held/historical attempts are not presented as actual current consumption.

Existing backend, receipt mapping and stock filing are unchanged. Reopen/update the console and extract a fresh archive; previously downloaded workbooks do not change automatically. Verified with 74 Node tests and the actual Excel/ZIP exporter using eight read-only real declarations (customer identities omitted from verification output).
