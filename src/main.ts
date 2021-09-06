// Required imports
import { DivideS, LoadConfigFile, TimeStr, EndOfPeriod } from './utils';
import { sprintf } from "sprintf-js";
import * as fs from 'fs';
import * as getPackageVersion from '@jsbits/get-package-version';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require('better-sqlite3-helper');

// --------------------------------------------------------------
type TStakingRecord = {
  name: string,
  id: string,
  recipientId: string,
  stash: string,
  amount: bigint,
  date: string,
  ignore?: boolean;
}

// --------------------------------------------------------------
type TFeeReceivedRecord = {
  name: string,
  id: string,
  authorId: string,
  feeReceived: bigint,
  date: string,
  ignore?: boolean;
}

// --------------------------------------------------------------
type TFeePaidRecord = {
  name: string,
  id: string,
  senderId: string,
  feePaid: bigint,
  date: string,
  ignore?: boolean;
}

// --------------------------------------------------------------
type TDepositRecord = {
  name: string,
  id: string,
  senderId: string,
  recipientId: string,
  amount: bigint,
  date: string,
  ignore?: boolean;
}

// --------------------------------------------------------------
type TWithdrawalRecord = {
  name: string,
  id: string,
  senderId: string,
  recipientId: string,
  amount: bigint,
  date: string,
  ignore?: boolean;
}

// --------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CreateCsv(fs: any, header: string, date: string, unit: string): string {
  const fileName = 'output/' + date + '_' + unit + '.csv';

  if (fs.existsSync(fileName))
    fs.unlinkSync(fileName);

  fs.writeFileSync(fileName, header);

  return fileName;
}

// --------------------------------------------------------------
function GetStakingRecords(name: string, accountID: string, atBlock: bigint): TStakingRecord[] {
  const res: TStakingRecord[] = db().query('SELECT ? as name, id, recipientId, addData AS stash, amount, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                            FROM transactions WHERE event=\'staking.Reward\' AND addData=? AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);
  return res;
}

// --------------------------------------------------------------
function GetFeePaidRecords(name: string, accountID: string, atBlock: bigint): TFeePaidRecord[] {
  const res1: TFeePaidRecord[] = db().query('SELECT ? as name, id, senderId, totalFee AS feePaid, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                             FROM transactions WHERE totalFee IS NOT NULL AND senderId=? AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);

  // fees for identity jugement:
  const res2: TFeePaidRecord[] = db().query('SELECT ? as name, id, senderId, amount AS feePaid, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                             FROM transactions WHERE event LIKE \'balances.ReserveRepatriated%\' AND senderId=? AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);

  const res = res1.concat(res2);

  // sort res by date
  res.sort((a: TFeePaidRecord, b: TFeePaidRecord) => { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return res;
}

// --------------------------------------------------------------
function GetFeeReceivedRecords(name: string, accountID: string, atBlock: bigint): TFeeReceivedRecord[] {
  const res: TFeeReceivedRecord[] = db().query('SELECT ? as name, id, authorId, feeBalances AS feeReceived, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                                FROM transactions WHERE feeBalances IS NOT NULL AND authorId=? AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);
  return res;
}

// --------------------------------------------------------------
function GetDepositRecords(name: string, accountID: string, atBlock: bigint): TDepositRecord[] {
  const res: TDepositRecord[] = db().query('SELECT ? as name, id, senderId, recipientId, amount, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                             FROM transactions WHERE senderId IS NOT NULL AND recipientId=? AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);
  return res;
}

// --------------------------------------------------------------
function GetWithdrawalRecords(name: string, accountID: string, atBlock: bigint): TWithdrawalRecord[] {
  const res: TWithdrawalRecord[] = db().query('SELECT ? as name, id, senderId, recipientId, amount, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                                FROM transactions WHERE senderId=? AND recipientId IS NOT NULL AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);
  return res;
}

// --------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutputStaking(progressOfs: number, progressCnt: number, file: string, format: string, daily: boolean, chainData: any, arr: TStakingRecord[]): { count: number, value: bigint } {
  const decimals = chainData.decimals;
  const unit = chainData.unit;
  const ticker = chainData.ticker;

  let value = BigInt(0);
  let count = 0;

  arr.forEach((e, idx) => {
    process.stdout.write(sprintf('\r  Progress: %d%%  ', progressOfs + (progressCnt * idx / arr.length)));

    if (e.ignore)
      return;

    value += e.amount;
    count++;

    const val = DivideS(e.amount, decimals);
    //"staking":  "\n\"Staking\",\"%s\",\"%s\",,,,,\"Staking_%s\",\"%s\",\"stash: %s tx:%s\",\"%s\",\"Staking_%s_%s\"
    fs.appendFileSync(file, sprintf(format, val, ticker, unit, e.recipientId, e.stash, e.id, daily ? e.date.substr(0, 11) + '23:59:59' : e.date, unit, e.id));
  });

  return {
    count: count,
    value: value
  };
}

// --------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutputFeeReceived(progressOfs: number, progressCnt: number, file: string, format: string, daily: boolean, chainData: any, arr: TFeeReceivedRecord[]): { count: number, value: bigint } {

  const decimals = chainData.decimals;
  const unit = chainData.unit;
  const ticker = chainData.ticker;

  let value = BigInt(0);
  let count = 0;

  arr.forEach((e, idx) => {
    process.stdout.write(sprintf('\r  Progress: %d%%  ', progressOfs + (progressCnt * idx / arr.length)));

    if (e.ignore)
      return;

    value += e.feeReceived;
    count++;

    const val = DivideS(e.feeReceived, decimals);
    // "\n\"Staking\",\"%s\",\"%s\",,,,,\"Staking_%s\",\"%s\",\"Fee received: tx:%s\",\"%s\",\"Staking_%s_%s\"",
    fs.appendFileSync(file, sprintf(format, val, ticker, unit, e.authorId, e.id, daily ? e.date.substr(0, 11) + '23:59:59' : e.date, unit, e.id));
  });

  return {
    count: count,
    value: value
  };
}

// --------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutputFeePaid(progressOfs: number, progressCnt: number, file: string, format: string, daily: boolean, chainData: any, arr: TFeePaidRecord[]): { count: number, value: bigint } {

  const decimals = chainData.decimals;
  const unit = chainData.unit;
  const ticker = chainData.ticker;

  let value = BigInt(0);
  let count = 0;

  arr.forEach((e, idx) => {
    process.stdout.write(sprintf('\r  Progress: %d%%  ', progressOfs + (progressCnt * idx / arr.length)));

    if (e.ignore)
      return;

    value += e.feePaid;
    count++;

    const val = DivideS(e.feePaid, decimals);
    // "\n\"Trade\",\"0\",\"EUR\",\"%s\",\"%s\",\"%s\",\"%s\",\"Staking_%s\",\"%s\",\"Fee paid: tx:%s\",\"%s\",\"Staking_%s_%s\",\"0.00000001\",\"0.00000001\""
    fs.appendFileSync(file, sprintf(format, val, ticker, val, ticker, unit, e.senderId, e.id, daily ? e.date.substr(0, 11) + '23:59:59' : e.date, unit, e.id));
  });

  return {
    count: count,
    value: value
  };
}

// --------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutputDeposits(progressOfs: number, progressCnt: number, file: string, format: string, chainData: any, arr: TDepositRecord[]): number {

  const decimals = chainData.decimals;
  const unit = chainData.unit;
  const ticker = chainData.ticker;

  let count = 0;

  arr.forEach((e, idx) => {
    process.stdout.write(sprintf('\r  Progress: %d%%  ', progressOfs + (progressCnt * idx / arr.length)));

    if (e.ignore)
      return;

    count++;

    const val = DivideS(e.amount, decimals);
    // "\n\"Deposit\",\"%s\",\"%s\",,,,,\"Wallet_%s \",\"%s\",\"tx:%s\",\"%s\",\"Wallet_%s_%s_D\"",
    fs.appendFileSync(file, sprintf(format, val, ticker, unit, e.recipientId, e.id, e.date, unit, e.id));
  });

  return count;
}

// --------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutputWithdrawals(progressOfs: number, progressCnt: number, file: string, format: string, chainData: any, arr: TWithdrawalRecord[]): number {

  const decimals = chainData.decimals;
  const unit = chainData.unit;
  const ticker = chainData.ticker;

  let count = 0;

  arr.forEach((e, idx) => {
    process.stdout.write(sprintf('\r  Progress: %d%%  ', progressOfs + (progressCnt * idx / arr.length)));

    if (e.ignore)
      return;

    count++;

    const val = DivideS(e.amount, decimals);
    // "\n\"Withdrawal\",,,\"%s\",\"%s\",,,\"Wallet_%s\" ,\"%s\",\"tx:%s\",\"%s\",\"Wallet_%s_%s_W\""
    fs.appendFileSync(file, sprintf(format, val, ticker, unit, e.senderId, e.id, e.date, unit, e.id));
  });

  return count;
}

// --------------------------------------------------------------
// --------------------------------------------------------------
function main() {
  // command line parameters:
  // process.argv[2]: chain (optional)
  // process.argv[3]: atBlock (optional)

  const config = LoadConfigFile();
  if (!config)
    return;

  // check given chain
  const chain = process.argv[2] || config.defchain;
  const chainData = config.chains[chain];
  if (!chainData) {
    console.log('Syntax: node build/main.js [chain] [atBlock]');
    const chains = Object.keys(config.chains).join(', ');
    console.log('        with chain in [%s]', chains);
    console.log('        with atBlock a block number');
    return;
  }

  // open database
  const options = {
    path: chainData.database || 'data/' + chain + '.db',
    readonly: false,
    fileMustExist: true, // throw error if database not exists
    WAL: false, // automatically enable 'PRAGMA journal_mode = WAL'?
    migrate: false,
  }
  db(options);
  db().defaultSafeIntegers(true);

  process.on('exit', () => db().close());     // close database on exit

  const ver = getPackageVersion();
  console.log('---------------------------------------------------------------');
  console.log(`cointracking-polka: v${ver}`);
  console.log(`Chain:              ${chain}`);
  console.log('---------------------------------------------------------------');
  if (!chainData.accounts.length) {
    console.log('No accounts given, abort.');
    return;
  }

  //const lastBlock = Number(db().queryFirstRow('SELECT max(height) FROM transactions').height);
  const maxBlock = Number.MAX_SAFE_INTEGER;
  const sBlock = process.argv[3];   // the block number was given by command line?
  const atBlock = isNaN(+sBlock) ? maxBlock : Math.min(+sBlock, maxBlock);
  const lastBlock = Number(db().queryFirstRow('SELECT max(height) As height FROM transactions WHERE height<=?', atBlock).height); // the last block <=atBlock
  let date = db().queryFirstRow('SELECT datetime(timestamp/1000, \'unixepoch\', \'localtime\') as dateStr, timestamp, height \
                                 FROM transactions WHERE height=?', lastBlock);
  if (!date) {
    console.log('Missing Data in Database, abort.');
    return;
  }

  const flagStaking = config.staking;
  const flagFeePaid = config.feePaid;
  const flagFeeReceived = config.feeReceived;
  const flagCreateTransfers = config.createTransfers || false;
  const formatStaking = config.csv.staking;
  const formatFeeReceived = config.csv.feeReceived;
  const formatFeePaid = config.csv.feePaid;
  const formatDeposit = config.csv.deposit;
  const formatWithdrawal = config.csv.withdrawal;
  const unit = chainData.unit;

  if (flagStaking == 'day' || flagFeePaid == 'day' || flagFeeReceived == 'day') {
    // if aggregation by day, we need the last complete day
    const d1 = new Date(date.dateStr);
    const d2 = EndOfPeriod(new Date(d1.getTime() - 86400000), 'day'); // end of the day before

    const h = db().queryFirstRow('SELECT max(height) as height FROM transactions WHERE timestamp<=?', d2.getTime()).height;

    date = db().queryFirstRow('SELECT datetime(timestamp/1000, \'unixepoch\', \'localtime\') as dateStr, timestamp, height FROM transactions WHERE height=?', h);
  }
  if (!date) {
    console.log('Missing Data in Database, abort.');
    return;
  }

  console.log('Using transaction data until block: %d (%s)', Number(date.height), date.dateStr);

  const file = CreateCsv(fs, config.csv.header, date.dateStr.substring(0, 10), unit);

  let arrStaking: TStakingRecord[] = [];
  let arrFeeReceived: TFeeReceivedRecord[] = [];
  let arrFeePaid: TFeePaidRecord[] = [];
  let arrDeposits: TDepositRecord[] = [];
  let arrWithdrawals: TWithdrawalRecord[] = [];

  // 1. iterate over all accounts and collect all data records
  console.log('Query data from database...');
  for (let i = 0, n = chainData.accounts.length; i < n; i++) {
    process.stdout.write(sprintf('\r  Progress: %d%%  ', 100.0 * i / n));

    const accountID = chainData.accounts[i].account;
    const name = chainData.accounts[i].name;

    if (flagStaking != 'none')
      arrStaking = arrStaking.concat(GetStakingRecords(name, accountID, date.height));

    if (flagFeeReceived != 'none')
      arrFeeReceived = arrFeeReceived.concat(GetFeeReceivedRecords(name, accountID, date.height));

    if (flagFeePaid != 'none')
      arrFeePaid = arrFeePaid.concat(GetFeePaidRecords(name, accountID, date.height));

    if (flagCreateTransfers) {
      arrDeposits = arrDeposits.concat(GetDepositRecords(name, accountID, date.height));
      arrWithdrawals = arrWithdrawals.concat(GetWithdrawalRecords(name, accountID, date.height));
    }

  }
  process.stdout.write('\r  Progress: 100%\n');

  // 2 aggregate entries, if required
  if (flagStaking == 'day' || flagStaking == 'time') {
    arrStaking.forEach((value: TStakingRecord, index: number, array: TStakingRecord[]) => {
      if (value.ignore) // the entry was processed already
        return;

      const d1 = new Date(value.date);
      const d2 = EndOfPeriod(d1, flagStaking);
      let i: number;
      for (i = index + 1; i < array.length && array[i].stash == value.stash; i++) {
        const d = new Date(array[i].date);
        if (d > d2)
          break;
        value.amount += array[i].amount;
        array[i].ignore = true;
      }
    });
  }

  if (flagFeeReceived == 'day' || flagFeeReceived == 'time') {
    arrFeeReceived.forEach((value: TFeeReceivedRecord, index: number, array: TFeeReceivedRecord[]) => {
      if (value.ignore) // the entry was processed already
        return;

      const d1 = new Date(value.date);
      const d2 = EndOfPeriod(d1, flagFeeReceived);
      let i: number;
      for (i = index + 1; i < array.length && array[i].authorId == value.authorId; i++) {
        const d = new Date(array[i].date);
        if (d > d2)
          break;
        value.feeReceived += array[i].feeReceived;
        array[i].ignore = true;
      }
    });
  }

  if (flagFeeReceived == 'day' || flagFeePaid == 'time') {
    arrFeePaid.forEach((value: TFeePaidRecord, index: number, array: TFeePaidRecord[]) => {
      if (value.ignore) // the entry was processed already
        return;

      const d1 = new Date(value.date);
      const d2 = EndOfPeriod(d1, flagFeeReceived);
      let i: number;
      for (i = index + 1; i < array.length && array[i].senderId == value.senderId; i++) {
        const d = new Date(array[i].date);
        if (d > d2)
          break;
        value.feePaid += array[i].feePaid;
        array[i].ignore = true;
      }
    });
  }

  // 3. iterate over all records
  console.log('Write csv file...');

  // for progress only:
  const total = arrStaking.length + arrFeeReceived.length + arrFeePaid.length + arrDeposits.length + arrWithdrawals.length;
  const cnt1 = 100.0 * arrStaking.length / total;
  const cnt2 = 100.0 * arrFeeReceived.length / total;
  const cnt3 = 100.0 * arrFeePaid.length / total;
  const cnt4 = 100.0 * arrDeposits.length / total;
  const cnt5 = 100.0 * arrWithdrawals.length / total;

  const staking = OutputStaking(0, cnt1, file, formatStaking, flagStaking == 'day', chainData, arrStaking);
  const feeReceived = OutputFeeReceived(cnt1, cnt2, file, formatFeeReceived, flagFeeReceived == 'day', chainData, arrFeeReceived);
  const feePaid = OutputFeePaid(cnt1 + cnt2, cnt3, file, formatFeePaid, flagFeePaid == 'day', chainData, arrFeePaid);
  const deposits = OutputDeposits(cnt1 + cnt2 + cnt3, cnt4, file, formatDeposit, chainData, arrDeposits);
  const withdrawals = OutputWithdrawals(cnt1 + cnt2 + cnt3 + cnt4, cnt5, file, formatWithdrawal, chainData, arrWithdrawals);

  process.stdout.write('\r  Progress: 100%\n\n');
  console.log(sprintf('Staking records:     %5d   Total: %s %s', staking.count, DivideS(staking.value, chainData.decimals), unit));
  console.log(sprintf('FeeReceived records: %5d   Total: %s %s', feeReceived.count, DivideS(feeReceived.value, chainData.decimals), unit));
  console.log(sprintf('FeePaid records:     %5d   Total: %s %s', feePaid.count, DivideS(-feePaid.value, chainData.decimals), unit));
  console.log(sprintf('Deposit records:     %5d', deposits));
  console.log(sprintf('Withdrawal records:  %5d', withdrawals));
}

main();
