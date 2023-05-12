# free-domain-checker

Free Domain Checker is a simple tool to check if a domain is available or not.

## configuration

in `config.json` file

```json
{
	"send": true,
	"host": "your.mail.server",
	"port": 25,
	"user": "your@mail.com",
	"pass": "password",
	"from": "\"Free Domain Checker\" <your@mail.com>",
	"to": "your@mail.com"
}
```

## Domain list

in `domains.txt` file (one domain per line)

## Start

```bash
apt install nodejs
npm install
npm run start
```
