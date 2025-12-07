# Branch Filtering Implementation - Updates Needed

## Dashboard.tsx Updates

Need to update 6 queries to include branch filtering:

1. Line 49: Add `selectedBranch` to queryKey
2. Lines 51-52: Add branch_id param when selectedBranch !== 'all'
3. Same pattern for all 6 queries

## Sales.tsx Updates

1. Already has BranchSelector imported (line 5)
2. Need to add selectedBranch state
3. Add branch filter to sales query
4. Add BranchSelector to filters UI
5. Add branch column to sales table

## Reports.tsx Updates

1. Need to import BranchSelector
2. Add selectedBranch state
3. Add branch filter to all report queries
4. Add BranchSelector to filters UI

Let me implement these changes now.

