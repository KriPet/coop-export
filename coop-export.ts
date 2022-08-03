// ==UserScript==
// @name         Coop transaction export
// @namespace    http://bakemo.no/
// @version      0.4
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



class CoopUtilities {

    private static async getTransactions(account: string) {
        const response = await fetch(`https://nettbank.coop.no/darwin/api/card-account/${account}/transactions?page=1&perPage=50`, {
            "credentials": "include",
            "headers": {
                "Accept": "application/vnd.no.entercard.coop-v1.0+json",
            },
            "referrer": "https://nettbank.coop.no/no/coop/",
            "method": "GET",
        });

        const json: { transactions: CoopTransaction[] } = await response.json();
        return json.transactions;
    }

    private static createElementWithContent(doc: XMLDocument, parent: HTMLElement, elemName: string, elemContent: string) {
        const newElem = doc.createElement(elemName);
        newElem.append(elemContent);
        parent.appendChild(newElem);
    }

    private static dateToXmlDate(date: Date) {
        const year = date.getUTCFullYear().toString();
        const month = (date.getUTCMonth() + 1).toString();
        const day = date.getUTCDate().toString();
        return year + month.padStart(2, "0") + day.padStart(2, "0");
    }

    private static async downloadTransactions(account: string) {
        if (account == null)
            return;

        const transactions = await this.getTransactions(account);
        if (transactions.length == 0)
            return;

        const { doc, transactionListElement } = this.createXmlDocument();

        for (const transaction of transactions) {
            const transactionElement = doc.createElement("STMTTRN");
            const date = new Date(transaction.transactionDate);

            this.createElementWithContent(doc, transactionElement, "DTPOSTED", this.dateToXmlDate(date));
            this.createElementWithContent(doc, transactionElement, "TRNAMT", transaction.billingAmount.toString());
            this.createElementWithContent(doc, transactionElement, "NAME", transaction.description);
            this.createElementWithContent(doc, transactionElement, "MEMO", transaction.description);
            transactionListElement.appendChild(transactionElement);
        }

        const xmlText = new XMLSerializer().serializeToString(doc);

        const blob = new Blob([xmlText], { type: "application/x-ofx" });

        const link = document.createElement("a");
        const dateString = new Date().toISOString().substring(0, 10);
        link.download = `${dateString} Coop Mastercard.ofx`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    private static createXmlDocument() {
        const doc = document.implementation.createDocument(null, "OFX", null);
        const OFX = doc.documentElement;
        const BANKMSGSRSV1 = OFX.appendChild(doc.createElement("BANKMSGSRSV1"));
        const STMTTRNRS = BANKMSGSRSV1.appendChild(doc.createElement("STMTTRNRS"));
        const STMTRS = STMTTRNRS.appendChild(doc.createElement("STMTRS"));
        const transactionListElement = STMTRS.appendChild(doc.createElement("BANKTRANLIST"));
        return { doc, transactionListElement }
    }

    private static getCurrentAccount() {
        const query = window.location.hash.split("?")[1];
        if (query === undefined) {
            throw "Can't get account id";
        }
        const usp = new URLSearchParams(query);
        if (!usp.has("id")) {
            throw "Can't get account id";
        }
        return usp.get("id") as string;
    }


    public static initialize() {
        console.log("Initializing Coop utitilies");
        document.addEventListener('keyup', (event) => {
            switch (event.key) {
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