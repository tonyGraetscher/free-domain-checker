const whois = require('whois')
const nodemailer = require("nodemailer");
const fs = require('fs');

const config = require('./config.json')
const domains = fs.readFileSync('./domains.txt').toString().split('\r\n');

function checkDomain(domain) {
    return new Promise((resolve, reject) => {
        const response = {
            domain: domain,
            isFree: false,
            registryExpiryDate: null,
            err: false
        }
        whois.lookup(domain, function(err, data) {
            if (err) {
                console.error(err)
                response.err = true
                resolve(response)
            } else {
                data.split('\n').forEach(line => {
                    //console.log(line)
                    if (line.includes('Domain not found.')) {
                        response.isFree = true
                    }
                    if (line.includes('Status: free')) {
                        response.isFree = true
                    }

                    if (line.includes('Expiry Date:')) {
                        const date = line.split(': ')[1]
                        response.registryExpiryDate = date
                    }
                    if (line.includes('Registrar Registration Expiration Date:')) {
                        const date = line.split(': ')[1]
                        response.registryExpiryDate = date
                    }
                });
            }
            resolve(response)
        })
    })
}

async function main() {
    const checkDomains = []

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: false, // true for 465, false for other ports
        auth: {
            user: config.user,// generated ethereal user
            pass: config.pass, // generated ethereal password
        },
    });

    for(let i = 0; i < domains.length; i++) {
        const domain = domains[i]
        console.log(`domain: [${i+1}/${domains.length}]`, domain)
        checkDomains.push(await checkDomain(domain))
    }
    console.log('finish check domains')

    //console.log('checkDomains:', checkDomains)

    const freeDomains = checkDomains.filter(domain => domain.isFree)
    console.log('freeDomains:', freeDomains)

    if (freeDomains.length > 0) {
        const freeDomainsText = "This free Domains: \r\n"+ freeDomains.map(domain => domain.domain).join('\r\n')
        const info = await transporter.sendMail({
            from: config.from, // sender address
            to: config.to, // list of receivers
            subject: "Domains are free", // Subject line
            text: freeDomainsText, // plain text body
        });
    }
}

main().catch(console.error);
