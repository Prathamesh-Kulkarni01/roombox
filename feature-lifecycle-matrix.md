# Feature Lifecycle Matrix

This dashboard tracks every core capability of RentSutra across its entire engineering maturity lifecycle. A feature is not considered "done" until it is fully certified across all dimensions.

| Capability | Implemented | Journey Exists | Certified | Enterprise Parity | Regression Coverage |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Authentication | ❌ | ✅ | ✅ | ❌ | ❌ |
| Owner Registration | ❌ | ✅ | ❌ | ❌ | ❌ |
| Property Setup | ❌ | ✅ | ❌ | ❌ | ❌ |
| Guest Lifecycle | ❌ | ✅ | ❌ | ❌ | ❌ |
| Monthly Rent Gen | ❌ | ❌ | ❌ | ❌ | ❌ |
| Rent Reminder | ❌ | ❌ | ❌ | ❌ | ❌ |
| Payment/Ledger | ❌ | ❌ | ❌ | ❌ | ❌ |
| Checkout/Refund | ❌ | ❌ | ❌ | ❌ | ❌ |
| Enterprise Isolation | ❌ | ❌ | ❌ | ❌ | ❌ |
| Migration | ❌ | ❌ | ❌ | ❌ | ❌ |

## Legend
- **Implemented**: The product code exists and is deployed.
- **Journey Exists**: The high-level business workflow is mapped in `/lab/journeys`.
- **Certified**: The feature passes standard capability certifications (Emulator).
- **Enterprise Parity**: The feature executes identically on the Enterprise BYOD provider.
- **Regression Coverage**: Production bugs related to this feature are permanently tracked in `/lab/certifications/regressions`.
