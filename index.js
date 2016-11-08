const http = require("http");
const https = require("https");

class Outland {
	constructor(conf, methods) {
		if(!conf.port) {
			throw new TypeError("Please set a port.");
		}

		if(conf.username && conf.password) {
			this.auth = "Basic " + Buffer.from(conf.username + ":" + conf.password).toString("base64");
		}

		this.host = conf.host || "localhost";
		this.port = conf.port || 8232;

		methods.forEach(method => {
			this[method] = function() {
				return this._query(method, ...arguments);
			}
		});
	}

	_query() {
		return new Promise((resolve, reject) => {
			const params = [...arguments];
			const method = params.shift();

			const postData = JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method, params
			});

			const { hostname, port } = this;

			const options = {
				hostname, port,
				method: "POST",
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(postData)
				}
			};

			if(this.auth) {
				options.headers["Authorization"] = this.auth;
			}

			const req = http.request(options, (res) => {
				let data = "";

				res.setEncoding("utf8");
				res.on("data", chunk => data += chunk);

				res.on("end", () => {
					let response;

					try {
						response = JSON.parse(data);
					} catch(error) {
						return reject(error);
					}

					if(response.error) {
						return reject(new Error(response.error));
					}

					resolve(response.result);
				});
			});

			req.on("error", reject);

			req.write(postData);
			req.end();
		});
	}
};

module.exports = Outland;
