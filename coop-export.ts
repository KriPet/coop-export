// ==UserScript==
// @name         Coop transaction export
// @namespace    http://bakemo.no/
// @version      0.2
// @author       Peter Kristoffersen
// @description  Press "-" to export the last month of transactions from currently open account
// @match        https://nettbank.coop.no/no/coop/*
// @updateUrl    https://github.com/KriPet/coop-export/raw/master/coop-export.user.js
// @copyright    2021+, Peter Kristoffersen
// @inject-into  page
// ==/UserScript==

interface CoopTransaction {
    transactionAmount: number; // foreign currency maybe
    transactionCurrency: string; // Currency code
    billingAmount: number;
    city: string;
    country: string;
	transactionDate: string; //"2021-04-07T00:00:00.000+00:00",
    description: string;
    id: number;
}



class CoopUtilities{

    private static async getTransactions(account: string){
        const response = await fetch(`https://nettbank.coop.no/darwin/api/card-account/${account}/transactions?page=1&perPage=50`, {
            "credentials": "include",
            "headers": {
                "Accept": "application/vnd.no.entercard.coop-v1.0+json",
            },
            "referrer": "https://nettbank.coop.no/no/coop/",
            "method": "GET",
        });

        const json: {transactions: CoopTransaction[]} = await response.json();
        return json.transactions;
    }

    private static getDescription(transaction: CoopTransaction){
        return `${transaction.description} - ${transaction.city} ${transaction.country} - ${transaction.transactionAmount} ${transaction.transactionCurrency}`;
    }

    private static async downloadTransactions(account: string)
    {
        if(account == null){
            return;
        }
        const transactions = await this.getTransactions(account);
        const header = "date\tmemo\tamount\n";
        const rows = transactions
            .map(t => `${t.transactionDate.substring(0,10)}\t${this.getDescription(t)}\t${t.billingAmount}\n`);
        if(rows.length === 0)
            return;
        const blob = new Blob([header, ...rows], {type: "text/tsv"});

        const link = document.createElement("a");
        const dateString = new Date().toISOString().substring(0,10);
        link.download = `${dateString} Coop Mastercard.tsv`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    private static getCurrentAccount(){
        const query = window.location.hash.split("?")[1];
        if(query === undefined){
            throw "Can't get account id";
        }
        const usp = new URLSearchParams(query);
        if(!usp.has("id")){
            throw "Can't get account id";
        }
        return usp.get("id") as string;
    }


    public static initialize(){
        console.log("Initializing Coop utitilies");
        document.addEventListener('keyup', (event) => {
            switch(event.key){
                case "-": {
                    const currentAccount = CoopUtilities.getCurrentAccount();
                    CoopUtilities.downloadTransactions(currentAccount);
                    break;
                }
            }
        });
    }
}


CoopUtilities.initialize();