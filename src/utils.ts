// Required imports
import Ajv from "ajv";
import * as fs from 'fs';
import * as chalk from 'chalk';

// --------------------------------------------------------------
// wait ms milliseconds
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// --------------------------------------------------------------
// bigint division with decimal result
export function Divide(a: bigint, b: bigint): number {
  const q = Number(BigInt(a) / BigInt(b));
  const r = Number(BigInt(a) % BigInt(b));
  return q + r / Number(b);
}

// --------------------------------------------------------------
// bigint division with string result
export function DivideS(a: bigint, decimals: number): string {
  const neg = a < 0;
  if (neg)
    a = -a;
  let s = a.toString();
  let pos = s.length - decimals;
  while (pos < 1) {
    s = '0' + s;
    pos++;
  }
  return (neg ? '-' : '') + s.substring(0, pos) + '.' + s.substring(pos);
}

// --------------------------------------------------------------
// validates configFile according to the schema file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ValidateConfigFile(config: any, schemaFile: string): any {
  const ajv = new Ajv({ allErrors: true });
  const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
  const validate = ajv.compile(schema);

  if (!validate(config)) {
    console.log(chalk.red(ajv.errorsText(validate.errors, { dataVar: 'config.json' })));
    return undefined;
  }

  return config;
}

// --------------------------------------------------------------
// loads config.json and return config object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LoadConfigFile(): any {
  const configFile = './config/config.json';
  const configFile_tpl = './config/config_tpl.json'

  // first copy config from temlate, if not there
  if (!fs.existsSync(configFile))
    fs.copyFileSync(configFile_tpl, configFile);

  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  return ValidateConfigFile(config, './schema/config.schema.json');
}

//------------------------------------------------------------------------------------
// two-digit number format
function pad(n: number): string {
  return (n < 10) ? '0' + n : n.toFixed(0);
}

//------------------------------------------------------------------------------------
// timestamp as string
export function TimeStr(timestamp: number, date: boolean, time: boolean): string {
  const d = new Date(timestamp);

  let s = '';
  if (date)
    s = s + d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  if (time) {
    if (s != '')
      s = s + ' ';
    s = s + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  }

  return s;
}

//------------------------------------------------------------------------------------
// returns the date of the end of the given period
// period:     "day": returns the end of the same day
//             "month": returns the end of the same month
//             all other: returns the date itself
export function EndOfPeriod(date: Date, period: string): Date {
  if (period == 'day') {
    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1); // the next day
    const d2 = new Date(d1.getTime() - 1);                                        // one ms before
    return d2;
  }
  else if (period == 'month') {
    const d1 = new Date(date.getFullYear(), date.getMonth() + 1); // the next month
    const d2 = new Date(d1.getTime() - 1);                        // one ms before
    return d2;
  }
  return date;
}
