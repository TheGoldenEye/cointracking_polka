# CHANGELOG

## 1.3.0 Mar 9, 2023

Changes:

- Possibility to define account lists for staking and not-staking

## 1.2.0 Dec 29, 2021

Changes:

- Added optional *"Comment"* field in account definition (config.json)
- database queries optimized
- added "createTransfers" flag to create Deposit/Withdrawal records
- allow to define a list of transaction ids to ignore (*"ignoreTx"*) 
- allow to define a list of deposit/withdrawal ids to ignore (*"ignoreTxDW"*) 
- consider renamed event names (e.g. *'staking.Reward'* -> *'staking.Rewarded'*)
- introduce a list of (external) account names, used in deposit/withdrawal records

## 1.1.0 Jan 3, 2021

Changes:

- only use data of complete days (data record aggregation by *'day'*)

## 1.0.0 Jan 2, 2021

Changes:

- Initial release
