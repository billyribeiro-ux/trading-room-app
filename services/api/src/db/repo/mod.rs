//! Repositories: the only code that issues SQL against tenant-scoped tables.
//!
//! Every function here takes `&mut TenantTx` and nothing else that could reach a connection.
//! That is fence #1 of the tenancy kernel (`crate::db`): there is no overload taking a pool,
//! so a query cannot be written that runs without a tenant GUC set. `TenantTx::conn` is
//! `pub(crate)`, which is what confines this ability to this module tree.
//!
//! Grouped by **aggregate** rather than one module per table, mirroring the foreign-key
//! topology - `note_versions` is meaningless without `notes`, so they live together.

pub mod alert;
pub mod event;
pub mod identity;
pub mod join;
pub mod managed_membership;
pub mod membership;
pub mod message;
pub mod moderation;
pub mod note;
pub mod poll;
pub mod room;
