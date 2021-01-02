# cointracking_polka

## 1 Overview

Staking in Polkadot is a tax-relevant process. But how do I find out what income
I have generated?  
Maybe you already use <https://cointracking.info>, the
"Leader for Cryptocurrency Tracking and Tax Reporting"  
If you do so, you have to import your staking data in the Cointracking Service.

This is where **cointracking_polka** comes into play, it generates reports on
staking income and fees for accounts to be freely defined.

**cointracking_polka** is a Node.js program written in typescript to create
staking reports usable with <https://cointracking.info>, the service which helps
you with tax return.  
The created csv files can be imported in the cointracking database using the menu:  
*Enter Coins | Bulk Imports | CSV Import*

The following coins are supported:

* Polkadot
* Kusama
* Westend (testnet, therefore not relevant for cointracking)

## 2 Installation

### 2.1 Prerequisites

These steps should only be carried out during the initial installation.

#### 2.1.1 Repository

First you have to clone the repository:

``` bash
git clone https://github.com/TheGoldenEye/cointracking_dpos.git
```

#### 2.1.2 Needed packages

We need some prerequisites:

``` bash
sudo apt install node-typescript npm
```

#### 2.1.3 Minimum node.js version

Now its time to check the nodejs version:

``` bash
node -v
```

If your node version is minimum v10.4.0, its fine. Otherwise you have to install
a newer version, because of the missing BigInt support in Node.js prior to v10.4.  
You can do it with the 'n node installer':

``` bash
sudo npm install -g n
sudo n lts
```

Now you should have a current node version installed.

#### 2.1.4 yarn package manager

This repo uses yarn workspaces to organise the code.
As such, after cloning, its dependencies should be installed via yarn package manager,
not via npm, the latter will result in broken dependencies.  
Install yarn, if you haven't already:

``` bash
sudo npm install -g yarn
```

### 2.2 Installing the project dependencies

*Please always run this when the sources have been updated from the git repository.*

Use yarn to install the dependencies:

``` bash
cd cointracking_polka
yarn
```

### 2.3 Installing the polka-store database(s)

The tool requires access to all transactions of the accounts to be analyzed.
Unfortunately, this is not possible in the Polkadot universe, since transaction
data cannot be queried directly there.  
Therefore **cointracking_polka** uses the transaction database of **polka-store**
<https://github.com/TheGoldenEye/polka-store>. Polka-store scans a Polkadot chain
(Polkadot/Kusama/Westend) and stores balance-relevant transactions in a SQLite database.  
If you want, you can download the latest versions of the transaction databases
[here](https://e.pcloud.link/publink/show?code=kZx3eZENGTspnf6YLueJK6F2w8ULTpnFIk).  
Alternatively you can install **polka-store** and create the transaction databases yourself.  

Please copy the Polkadot.db and/or Kusama.db to your data directory.

## 3 Configuration

### 3.1 config/config.json

You can find a template for configuration in `config/config_tpl.json`.
Instead, the file used by the tool is `config/config.json`.
If the file does not exist, `config/config_tpl.json` is copied to
`config/config.json` during the program start phase.  
You can adapt this file (`config.json`) to your needs.

Here are the parameters defined for the different chains.  
In the `accounts` list you can define the accounts to analyze (stash accounts
for staking rewards or any other accounts for tracking the fees).  
Besides the accounts list there is currently no need to change the default configuration.

``` json
config.json:
{
  "staking": "day",
  "feeReceived": "day",
  "feePaid": "day",
  "defchain": "Polkadot",
  "chains": {
    "Polkadot": {
      "database": "data/Polkadot.db",
      "unit": "DOT",
      "ticker": "DOT2",
      "decimals": 10,
      "accounts": [
        { "name": "Example1", "account": "15kUt2i86LHRWCkE3D9Bg1HZAoc2smhn1fwPzDERTb1BXAkX" },
        { "name": "Example2", "account": "12xtAYsRUrmbniiWQqJtECiBQrMn8AypQcXhnQAc6RB6XkLW" }
      ]
    },
    "Kusama": {
      "database": "data/Kusama.db",
      "unit": "KSM",
      "ticker": "KSM",
      "decimals": 12,
      "accounts": [
        { "name": "Example1", "account": "HmFYPT1btmi1T9qqs5WtuNJK93yNdnjjhReZh6emgNQvCHa" },
        { "name": "Example2", "account": "GXPPBuUaZYYYvsEquX55AQ1MRvgZ96kniEKyAVDSdv1SX96" }
      ]
    },
    "Westend": {
      "database": "data/Westend.db",
      "unit": "WND",
      "ticker": "WND",
      "decimals": 12,
      "accounts": [
        { "name": "Example1", "account": "5FnD6fKjTFLDKwBvrieQ6ZthZbgMjppynLhKqiRUft9yr8Nf" },
        { "name": "Example2", "account": "5DfdW2r2hyXzGdXFqAVJKGrtxV2UaacnVNr3sAdgCUDc9N9g" }
      ]
    }
  },
  "csv": {
    "header":      "\"Type\",\"Buy\",\"Cur.\",\"Sell\",\"Cur.\",\"Fee\",\"Cur.\",\"Exchange\",\"Group\",\"Comment\",\"Date\",\"TradeID\",\"BuyValue\",\"SellValue\"",
    "staking":     "\n\"Staking\",\"%s\",\"%s\",,,,,\"Staking_%s\",\"%s\",\"stash: %s tx:%s\",\"%s\",\"Staking_%s_%s\"",
    "feeReceived": "\n\"Staking\",\"%s\",\"%s\",,,,,\"Staking_%s\",\"%s\",\"Fee received: tx:%s\",\"%s\",\"Staking_%s_%s\"",
    "feePaid":     "\n\"Trade\",\"0\",\"EUR\",\"%s\",\"%s\",\"%s\",\"%s\",\"Staking_%s\",\"%s\",\"Fee paid: tx:%s\",\"%s\",\"Staking_%s_%s\",\"0.00000001\",\"0.00000001\""
  }
}
```

**_Global settings:_**  
**staking:**  Please define the aggregation level of the staking records.  
Valid values: [ "individual", "time", "day", "none" ]

* "individual": no aggregation
* "time":  all staking records with the same time are combined
* "day":  all staking records of a day are combined
* "none": disables staking records

**feeReceived:**  Please define the aggregation level of the records based on
fees you got as block author (validators only).  
Valid values: [ "individual", "time", "day", "none" ]  
The values have the same meaning as in staking  
**feePaid:**  Please define the aggregation level of the records based on
fees you paid in various transactions.  
Valid values: [ "individual", "time", "day", "none" ]  
The values have the same meaning as in staking  
**defchain:** The chain which is used (if no chain is given in the command line)  

**_Chain specific settings:_**  
**database:** The path to the sqlite transaction database (input) from polka-store  
**unit:** The unit of the coin  
**ticker:** The associated ticker symbol in cointracking  
**decimals:** Defines the number of decimal places  
**accounts:** A list of accounts to analyze

## 4 Running

### 4.1 Compile Typescript

Now you have to build the code (compile typescript to javascript)

``` bash
yarn build
```

### 4.2 Start program

**One** of the following commands starts the tool, collecting data from the **given** chain:

``` bash
yarn polkadot
yarn kusama
```

Your console will show information like this:

``` text
---------------------------------------------------------------
cointracking-polka: v1.0.0
Chain:              Polkadot
---------------------------------------------------------------
Using transaction data until block: 3139419 (2020-12-31 15:39:06)
Query data from database...
  Progress: 100%
Write csv file...
  Progress: 100%

Staking records:       112   Total: 94.5173137605 DOT
FeeReceived records:     0   Total: 0.0000000000 DOT
FeePaid records:        27   Total: -0.7801000000 DOT
```

## 5 CSV Output

The created csv file you can find in the *output* directory. You con import it
in <https://cointracking.info> using the menu:  
*Enter Coins | Bulk Imports | CSV Import*

## 6 Known issues

* Currently no known issues

## 6 Contributions

I welcome contributions. Before submitting your PR, make sure to run the following commands:

* `yarn lint`: Make sure your code follows the linting rules.
* `yarn lint --fix`: Automatically fix linting errors.

<https://github.com/TheGoldenEye/cointracking_polka/graphs/contributors>

## 7 Authors

* GoldenEye

## 8 Please support me

If you like my work, please consider to support me in the Polkadot/Kusama
networks and nominate my validators:

**Polkadot:**

1. [Validator GoldenEye](https://polkadot.subscan.io/account/14K71ECxvekU8BXGJmSQLed2XssM3HdBYQBuDUwHeUMUgBHk)
2. [Validator GoldenEye/2](https://polkadot.subscan.io/account/14gYRjn6fn5hu45zEAtXodPDbtaditK8twoWUXFi6DsLwd31)

**Kusama:**

1. [Validator GoldenEye](https://kusama.subscan.io/account/FiNuPk2iPirbKC7Spse3NuE9rWjzaQonZmk6wRvk1LcEU13)
2. [Validator GoldenEye/2](https://kusama.subscan.io/account/GcQXL1HgF1ZETZi3Tw3PoXGWeXbDpfsJrrgNgwxde4uoVaB)
3. [Validator GoldenEye/3](https://kusama.subscan.io/account/HjH4dvyPv2RQMA6XUQPqF37rZZ8seNjPQqYRSm3utdszsin)

## 9 License

Apache 2.0 License  
Copyright (c) 2021 GoldenEye

**Disclaimer:
The tool is provided as-is. I cannot give a guarantee for accuracy and I assume NO LIABILITY.**
