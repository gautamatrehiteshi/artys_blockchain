/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
let util = require('util');
let helper = require('./helper.js');

// let queryChaincode = async function (peer, channelName, chaincodeName, args, fcn, username, org_name) {
let queryChaincode = async function (peer, channelName, chaincodeName, username, org_name) {

	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);
		let channel = client.getChannel(channelName);
		console.log(channel,'channelelllllllll')
		if (!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			console.log(message);
			throw new Error(message);
		}

		// send query
		let request = {
			targets: [peer], //queryByChaincode allows for multiple targets
			chaincodeId: chaincodeName,
			// fcn: fcn,
			// args: args
		};
		let response_payloads = await channel.queryByChaincode(request);

		if (response_payloads[0].status == 500) {
			return {
				status: 500,
				error: response_payloads[0].toString('utf8'),
				successs: false
			}
		}

		console.log(response_payloads[0].toString('utf8'));

		if (response_payloads != '') {
			for (let i = 0; i < response_payloads.length; i++) {
				console.log('Batch', args[0] + '=' + response_payloads[i].toString('utf8'));
			}
			// return a JSON Object as response  
			return JSON.parse(response_payloads.toString('utf8'));
		} else {
			console.log('response_payloads is null');
			throw new Error('response_payload is null')
		}
	} catch (error) {
		console.log('Failed to query due to error: ' + error.stack ? error.stack : error);
		throw new Error(`${error.message}`);
	}
};

let getBlockByNumber = async function (peer, channelName, blockNumber, username, org_name) {
	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);
		let channel = client.getChannel(channelName);
		if (!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			console.log(message);
			throw new Error(message);
		}

		let response_payload = await channel.queryBlock(parseInt(blockNumber, peer));
		if (response_payload) {
			console.log(response_payload);
			return response_payload;
		} else {
			console.log('response_payload is null');
			return 'response_payload is null';
		}
	} catch (error) {
		console.log('Failed to query due to error: ' + error.stack ? error.stack : error);
		return error.toString();
	}
};
let getTransactionByID = async function (peer, channelName, trxnID, username, org_name) {
	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);
		let channel = client.getChannel(channelName);
		if (!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			console.log(message);
			throw new Error(message);
		}

		let response_payload = await channel.queryTransaction(trxnID, peer);
		if (response_payload) {
			console.log(response_payload);
			return response_payload;
		} else {
			console.log('response_payload is null');
			return 'response_payload is null';
		}
	} catch (error) {
		console.log('Failed to query due to error: ' + error.stack ? error.stack : error);
		return error.toString();
	}
};
let getBlockByHash = async function (peer, channelName, hash, username, org_name) {
	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);
		let channel = client.getChannel(channelName);
		if (!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			console.log(message);
			throw new Error(message);
		}

		let response_payload = await channel.queryBlockByHash(Buffer.from(hash), peer);
		if (response_payload) {
			console.log(response_payload);
			return response_payload;
		} else {
			console.log('response_payload is null');
			return 'response_payload is null';
		}
	} catch (error) {
		console.log('Failed to query due to error: ' + error.stack ? error.stack : error);
		return error.toString();
	}
};
let getChainInfo = async function (peer, channelName, username, org_name) {
	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);
		let channel = client.getChannel(channelName);
		if (!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			console.log(message);
			throw new Error(message);
		}

		let response_payload = await channel.queryInfo(peer);
		if (response_payload) {
			console.log(response_payload);
			return response_payload;
		} else {
			console.log('response_payload is null');
			return 'response_payload is null';
		}
	} catch (error) {
		console.log('Failed to query due to error: ' + error.stack ? error.stack : error);
		return error.toString();
	}
};
//getInstalledChaincodes
let getInstalledChaincodes = async function (peer, channelName, type, username, org_name) {
	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);

		let response = null
		if (type === 'installed') {
			response = await client.queryInstalledChaincodes(peer, true); //use the admin identity
		} else {
			let channel = client.getChannel(channelName);
			if (!channel) {
				let message = util.format('Channel %s was not defined in the connection profile', channelName);
				console.log(message);
				throw new Error(message);
			}
			response = await channel.queryInstantiatedChaincodes(peer, true); //use the admin identity
		}
		if (response) {
			if (type === 'installed') {
				console.log('<<< Installed Chaincodes >>>');
			} else {
				console.log('<<< Instantiated Chaincodes >>>');
			}
			let details = [];
			for (let i = 0; i < response.chaincodes.length; i++) {
				console.log('name: ' + response.chaincodes[i].name + ', version: ' +
					response.chaincodes[i].version + ', path: ' + response.chaincodes[i].path
				);
				details.push('name: ' + response.chaincodes[i].name + ', version: ' +
					response.chaincodes[i].version + ', path: ' + response.chaincodes[i].path
				);
			}
			return details;
		} else {
			console.log('response is null');
			return 'response is null';
		}
	} catch (error) {
		console.log('Failed to query due to error: ' + error.stack ? error.stack : error);
		return error.toString();
	}
};
let getChannels = async function (peer, username, org_name) {
	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);

		let response = await client.queryChannels(peer);
		if (response) {
			console.log('<<< channels >>>');
			let channelNames = [];
			for (let i = 0; i < response.channels.length; i++) {
				channelNames.push('channel id: ' + response.channels[i].channel_id);
			}
			console.log(channelNames);
			return response;
		} else {
			console.log('response_payloads is null');
			return 'response_payloads is null';
		}
	} catch (error) {
		console.log('Failed to query due to error: ' + error.stack ? error.stack : error);
		return error.toString();
	}
};

exports.queryChaincode = queryChaincode;
exports.getBlockByNumber = getBlockByNumber;
exports.getTransactionByID = getTransactionByID;
exports.getBlockByHash = getBlockByHash;
exports.getChainInfo = getChainInfo;
exports.getInstalledChaincodes = getInstalledChaincodes;
exports.getChannels = getChannels;
