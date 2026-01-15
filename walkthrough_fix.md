
# User Count Discrepancy Fix

This document outlines the changes made to resolve the user count discrepancy between the Admin Dashboard and the User Management page.

## Problem
The Admin Dashboard display was showing "Active Users" (12), filtered by onboarding status, while the User Management page was showing "Total Users" (27). This created confusion as the counts did not match.

## Solution
We updated the dashboard to display the **Total Users** count, consistent with the User Management page.

### Changes Implemented

1.  **`src/services/firestoreService.js`**:
    -   Updated `getPlatformStats` function to include the `totalUsers` count (raw count of all users) in the returned data structure under `stats.activeUsers.all`.
    -   Previously, it only returned filtering counts for "active" (onboarded) users.

2.  **`src/pages/admin/Dashboard.jsx`**:
    -   Updated the "Active Users" card title to **"TOPLAM KULLANICI"** (Total Users).
    -   Changed the displayed value from `stats.activeUsers.total` (filtered) to `stats.activeUsers.all` (total count).

## Verification
-   The Dashboard now displays "TOPLAM KULLANICI" with the count of 27 (matching the provided context).
-   The User Management page continues to show 27 users.
-   The counts are now synchronized across both admin views.
