// Required imports
import { Divide, DivideS, LoadConfigFile, TimeStr, EndOfPeriod } from './utils';
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
function CreateCsv(fs: any, header: string, timestamp: number, unit: string): string {
  const fileName = 'output/' + TimeStr(timestamp, true, false) + '_' + unit + '.csv';

  if (fs.existsSync(fileName))
    fs.unlinkSync(fileName);

  fs.writeFileSync(fileName, header);

  return fileName;
}

// --------------------------------------------------------------
function GetStakingRecords(name: string, accountID: string, atBlock: number): TStakingRecord[] {
  const res: TStakingRecord[] = db().query('SELECT ? as name, id, recipientId, addData AS stash, amount, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                            FROM transactions WHERE event=\'staking.Reward\' AND addData=? AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);
  return res;
}

// --------------------------------------------------------------
function GetFeePaidRecords(name: string, accountID: string, atBlock: number): TFeePaidRecord[] {
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
function GetFeeReceivedRecords(name: string, accountID: string, atBlock: number): TFeeReceivedRecord[] {
  const res: TFeeReceivedRecord[] = db().query('SELECT ? as name, id, authorId, feeBalances AS feeReceived, datetime(timestamp/1000, \'unixepoch\', \'localtime\') AS date \
                                                FROM transactions WHERE feeBalances IS NOT NULL AND authorId=? AND height<=? ORDER BY timestamp ASC',
    name, accountID, atBlock);
  return res;
}

// --------------------------------------------------------------
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

  const lastBlock = Number(db().queryFirstRow('SELECT max(height) AS val FROM transactions').val);
  const sBlock = process.argv[3];   // the block number was given by command line?
  const atBlock = isNaN(+sBlock) ? lastBlock : Math.min(+sBlock, lastBlock);  // not behind lastBlock
  const date = db().queryFirstRow('SELECT datetime(timestamp/1000, \'unixepoch\', \'localtime\') as dateStr, timestamp FROM transactions WHERE height=?', atBlock);

  const flagStaking = config.staking;
  const flagFeePaid = config.feePaid;
  const flagFeeReceived = config.feeReceived;
  const formatStaking = config.csv.staking;
  const formatFeeReceived = config.csv.feeReceived;
  const formatFeePaid = config.csv.feePaid;
  const unit = chainData.unit;

  console.log('Use transaction data until block: %d (%s)', atBlock, date ? date.dateStr : '?');

  const file = CreateCsv(fs, config.csv.header, Number(date.timestamp), unit);

  let arrStaking: TStakingRecord[] = [];
  let arrFeeReceived: TFeeReceivedRecord[] = [];
  let arrFeePaid: TFeePaidRecord[] = [];

  // 1. iterate over all accounts and collect all data records
  console.log('Query data from database...');
  for (let i = 0, n = chainData.accounts.length; i < n; i++) {
    process.stdout.write(sprintf('\r  Progress: %d%%  ', 100.0 * i / n));

    const accountID = chainData.accounts[i].account;
    const name = chainData.accounts[i].name;

    if (flagStaking != 'none')
      arrStaking = arrStaking.concat(GetStakingRecords(name, accountID, atBlock));

    if (flagFeeReceived != 'none')
      arrFeeReceived = arrFeeReceived.concat(GetFeeReceivedRecords(name, accountID, atBlock));

    if (flagFeePaid != 'none')
      arrFeePaid = arrFeePaid.concat(GetFeePaidRecords(name, accountID, atBlock));

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
  const total = arrStaking.length + arrFeeReceived.length + arrFeePaid.length;
  const cnt1 = 100.0 * arrStaking.length / total;
  const cnt2 = 100.0 * arrFeeReceived.length / total;
  const cnt3 = 100.0 * arrFeePaid.length / total;

  const staking = OutputStaking(0, cnt1, file, formatStaking, flagStaking == 'day', chainData, arrStaking);
  const feeReceived = OutputFeeReceived(cnt1, cnt2, file, formatFeeReceived, flagFeeReceived == 'day', chainData, arrFeeReceived);
  const feePaid = OutputFeePaid(cnt1 + cnt2, cnt3, file, formatFeePaid, flagFeePaid == 'day', chainData, arrFeePaid);

  process.stdout.write('\r  Progress: 100%\n\n');
  console.log(sprintf('Staking records:     %5d   Total: %s %s', staking.count, DivideS(staking.value, chainData.decimals), unit));
  console.log(sprintf('FeeReceived records: %5d   Total: %s %s', feeReceived.count, DivideS(feeReceived.value, chainData.decimals), unit));
  console.log(sprintf('FeePaid records:     %5d   Total: %s %s', feePaid.count, DivideS(-feePaid.value, chainData.decimals), unit));
}

main();
