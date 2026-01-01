# Branch Filtering - Implementation Instructions

Due to the complexity and length of the changes, I'll implement them directly in the files. Here's what needs to be changed:

## Dashboard.tsx - 6 Query Updates
Each query needs:
1. Add `selectedBranch` to queryKey array
2. Create params object with branch filtering
3. Add `branch_id` param when `selectedBranch !== 'all'`

## Sales.tsx - Complete Implementation
1. Add `selectedBranch` state
2. Update query to filter by branch
3. Add BranchSelector to filters UI
4. Add branch column to sales table

## Reports.tsx - Complete Implementation  
1. Import BranchSelector
2. Add `selectedBranch` state
3. Update all 3 queries to filter by branch
4. Add BranchSelector to filters UI

Let me proceed with the implementation now!




