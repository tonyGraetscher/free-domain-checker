import chalk from "chalk";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import whois from "whois";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

//const whois = require("whois");
//const nodemailer = require("nodemailer");
//const fs = require("fs");

function checkDomain(domain) {
	return new Promise((resolve, reject) => {
		const response = {
			domain: domain,
			isFree: false,
			registryExpiryDate: null,
			err: false,
		};
		whois.lookup(domain, function (err, data) {
			if (err) {
				console.error(err);
				response.err = true;
				resolve(response);
			} else {
				data.split("\n").forEach((line) => {
					//console.log(line)
					if (line.includes("Domain not found.")) {
						response.isFree = true;
					}
					if (line.includes("Status: free")) {
						response.isFree = true;
					}

					if (line.includes("Expiry Date:")) {
						const date = line.split(": ")[1];
						response.registryExpiryDate = date;
					}
					if (line.includes("Registrar Registration Expiration Date:")) {
						const date = line.split(": ")[1];
						response.registryExpiryDate = date;
					}
				});
			}
			resolve(response);
		});
	});
}

async function main() {
	console.log(
		chalk.blue(`
 /$$$$$$$                                    /$$                  /$$$$$$  /$$                           /$$                          
| $$__  $$                                  |__/                 /$$__  $$| $$                          | $$                          
| $$  \\ $$  /$$$$$$  /$$$$$$/$$$$   /$$$$$$  /$$ /$$$$$$$       | $$  \\__/| $$$$$$$   /$$$$$$   /$$$$$$$| $$   /$$  /$$$$$$   /$$$$$$ 
| $$  | $$ /$$__  $$| $$_  $$_  $$ |____  $$| $$| $$__  $$      | $$      | $$__  $$ /$$__  $$ /$$_____/| $$  /$$/ /$$__  $$ /$$__  $$
| $$  | $$| $$  \\ $$| $$ \\ $$ \\ $$  /$$$$$$$| $$| $$  \\ $$      | $$      | $$  \\ $$| $$$$$$$$| $$      | $$$$$$/ | $$$$$$$$| $$  \\__/
| $$  | $$| $$  | $$| $$ | $$ | $$ /$$__  $$| $$| $$  | $$      | $$    $$| $$  | $$| $$_____/| $$      | $$_  $$ | $$_____/| $$      
| $$$$$$$/|  $$$$$$/| $$ | $$ | $$|  $$$$$$$| $$| $$  | $$      |  $$$$$$/| $$  | $$|  $$$$$$$|  $$$$$$$| $$ \\  $$|  $$$$$$$| $$      
|_______/  \\______/ |__/ |__/ |__/ \\_______/|__/|__/  |__/       \\______/ |__/  |__/ \\_______/ \\_______/|__/  \\__/ \\_______/|__/                                                                                                                                                                                       
`)
	);
	console.log(chalk.green("Hallo, checken my GitHub-Profil \u{1F680} ") + chalk.blue("https://github.com/tonyGraetscher"));

	if (!fs.existsSync("./config.json")) {
		console.log(chalk.red("Please create a config.json file. You can use the config.json.example file as a template."));
		process.exit(1);
	}
	const config = require("./config.json");

	const domainFile = config.domainFile || "domains.txt";
	if (!fs.existsSync(domainFile)) {
		console.log(chalk.red(`Please create a ${domainFile} file.`));
		process.exit(1);
	}
	const domains = fs.readFileSync(domainFile, "utf8").toString().split("\n");
	const domainList = [];
	const checkDomains = [];

	// domains checken
	for (let i = 0; i < domains.length; i++) {
		let domain = domains[i];
		// remove \n and \r
		domain = domain.split("\n")[0].split("\r")[0];
		// remove # and // comments
		domain = domain.split(/#(.*)/)[0].split(/\/\/(.*)/)[0];

		// check if domain is not in list and not empty and not space
		if (!domainList.includes(domain) && domain !== "") {
			const domainParts = domain.split(".");
			const domainTLD = domainParts[domainParts.length - 1];
			const domainTLDList = domainTLD.split("/");
			// check if domain has more than one TLD
			if (domainTLDList.length > 1) {
				// add all TLDs to domainList
				for (let i = 0; i < domainTLDList.length; i++) {
					const domainTLD = domainTLDList[i];
					domainParts[domainParts.length - 1] = domainTLD;
					const newDomain = domainParts.join(".");
					domainList.push(newDomain);
				}
			} else {
				// add domain to domainList
				domainList.push(domain);
			}
		}
	}

	console.log("start check domains");
	// check domains
	for (let i = 0; i < domainList.length; i++) {
		const domain = domainList[i];
		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`domain: [${i + 1}/${domainList.length}] ${domain}`);
		checkDomains.push(await checkDomain(domain));
	}
	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	process.stdout.write(`domain: [${domainList.length}/${domainList.length}]`);
	process.stdout.write("\n");
	console.log(chalk.green("finish check domains"));

	const freeDomains = checkDomains.filter((domain) => domain.isFree);

	console.log(chalk.gray(`Totel Domains: ${domainList.length}`));
	console.log(chalk.gray(`Free Domains: ${freeDomains.length}`));
	console.log(chalk.gray(`Not Free Domains: ${domainList.length - freeDomains.length}`));

	if (config.consoleOutput === "free") {
		console.log("freeDomains:", freeDomains);
	} else if (config.consoleOutput === "all") {
		console.log("checkDomains:", checkDomains);
	}

	// send mail
	if (config.send) {
		// check config
		if (!config.host || !config.port || !config.user || !config.pass || !config.from || !config.to) {
			console.log(chalk.red("Please fill in all fields in the config.json file."));
			process.exit(1);
		}
		// create reusable transporter object using the default SMTP transport
		const transporter = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: false, // true for 465, false for other ports
			auth: {
				user: config.user, // generated ethereal user
				pass: config.pass, // generated ethereal password
			},
		});

		// send mail with defined transport object
		let mailText = `This free Domains: \r\n${freeDomains.map((domain) => domain.domain).join("\r\n")}`;
		if (config.mailOutput === "all") {
			mailText = `This all Domains: \r\n${checkDomains.map((domain) => `${domain.isFree ? "Free" : "forgive"} ${domain.domain}`).join("\r\n")}`;
		}
		await transporter.sendMail({
			from: config.from, // sender address
			to: config.to, // list of receivers
			subject: "Free Domain Checker", // Subject line
			text: mailText, // plain text body
		});
		console.log(chalk.green("send mail"));
	}

	// write file
	const filePath = path.join(process.cwd(), `check-domains-${new Date().toISOString().replaceAll(":", "")}.json`);
	if (config.outputFile === "all") {
		fs.writeFileSync(filePath, JSON.stringify(checkDomains, null, 2));
	} else if (config.outputFile === "free") {
		fs.writeFileSync(filePath, JSON.stringify(freeDomains));
	}

	console.log(chalk.yellow("good bye"));
}

main().catch(console.error);
