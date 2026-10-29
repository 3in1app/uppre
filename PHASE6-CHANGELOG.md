# Phase 6 — Key settings and customer services

- Added arbitrary local date/time expiry for newly created access keys; blank means no expiry.
- Added an Admin editor for existing non-revoked keys: label, expiry date/time, and usage limit.
- Kept key secrets hashed; the raw key cannot be retrieved or changed after creation. Create a replacement key if a different raw key is needed.
- Removed the global widget-frame selection/upload controls from the Admin page.
- Added an embedded `https://locket.jayteam.click/caption.html` editor to the customer services section and allowed that origin in this website's `frame-src` Content Security Policy.
- Updated the README to explain cross-device data visibility: users must access the same deployed website and its persistent server-side `data/` directory. Separate local copies do not sync.

Note: iframe embedding still depends on the caption service allowing itself to be embedded. Persistent JSON storage is suitable only for one server instance with persistent disk.
