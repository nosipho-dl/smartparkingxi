# ScratchXI Firebase Security Specification

## Data Invariants
1. A user can only access their own private information and bookings.
2. A booking must have a valid `userId` matching the authenticated user.
3. A booking must reference a valid `zoneId` and `bayId`.
4. Users cannot modify parking zone or bay status directly (except by making a booking).
5. All IDs must be correctly formatted to prevent injection.
6. Timestamps must be server-generated.

## The "Dirty Dozen" Payloads (Targeted for Rejection)
1. **Identity Theft**: Creating a booking for another user (`userId` mismatch).
2. **Access Escalation**: User attempting to read another user's `private/info`.
3. **Data Poisoning**: Injecting a 2MB string as a `bayLabel`.
4. **ID Injection**: Using a path-traversal or junk character string as a `zoneId`.
5. **State Shortcut**: Updating a booking status from `confirmed` directly to `completed` without owner verification (if systemic).
6. **Ghost Booking**: Creating a booking with an invalid or non-existent `zoneId`.
7. **Time Travel**: Providing a client-side `createdAt` timestamp.
8. **Admin Simulation**: User attempting to update a `Zone`'s capacity.
9. **Shadow Fields**: Adding an `isAdmin: true` field to a user profile.
10. **Bulk Scraping**: Querying all bookings without a `userId` filter.
11. **Orphaned Write**: Creating a booking without updating the bay status (requires `getAfter` check if enforced).
12. **Negative Capacity**: Updating a zone to have `used: -1`.

## Testing Plan
- `firestore.rules.test.ts` will verify that all above payloads return `PERMISSION_DENIED`.
