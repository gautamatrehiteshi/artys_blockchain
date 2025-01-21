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
'use strict';
let util = require('util');
let helper = require('./helper.js');


let instantiateChaincode = async function(peers, channelName, chaincodeName, chaincodeVersion, functionName, chaincodeType, args, username, org_name) {
	console.log('\n\n============ Instantiate chaincode on channel ' + channelName +
		' ============\n');
	let error_message = null;

	try {
		// first setup the client for this org
		let client = await helper.getClientForOrg(org_name, username);
		console.log('Successfully got the fabric client for the organization "%s"', org_name);
		let channel = client.getChannel(channelName);
		if(!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			console.log(message);
			throw new Error(message);
		}
		let tx_id = client.newTransactionID(true); // Get an admin based transactionID
		                                       // An admin based transactionID will
		                                       // indicate that admin identity should
		                                       // be used to sign the proposal request.
		// will need the transaction ID string for the event registration later
		let deployId = tx_id.getTransactionID();

		// send proposal to endorser
		let request = {
			targets : peers,
			chaincodeId: chaincodeName,
			chaincodeType: chaincodeType,
			chaincodeVersion: chaincodeVersion,
			args: args,
			txId: tx_id,

			// Use this to demonstrate the following policy:
			// The policy can be fulfilled when members from both orgs signed.
			'endorsement-policy': {
			        identities: [
					{ role: { name: 'member', mspId: 'Org1MSP' }},
					{ role: { name: 'member', mspId: 'Org2MSP' }}
			        ],
			        policy: {
					'2-of':[{ 'signed-by': 0 }, { 'signed-by': 1 }]
			        }
		        }
		};
		if (functionName)
			request.fcn = functionName;

		let results = await channel.sendInstantiateProposal(request, 60000); //instantiate takes much longer

		// the returned object has both the endorsement results
		// and the actual proposal, the proposal will be needed
		// later when we send a transaction to the orderer
		let proposalResponses = results[0];
		let proposal = results[1];

		// lets have a look at the responses to see if they are
		// all good, if good they will also include signatures
		// required to be committed
		let all_good = true;
		for (let i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response &&
				proposalResponses[i].response.status === 200) {
				one_good = true;
				console.log('instantiate proposal was good');
			} else {
				console.log('instantiate proposal was bad');
			}
			all_good = all_good & one_good;
		}

		if (all_good) {
			console.log(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
				proposalResponses[0].response.status, proposalResponses[0].response.message,
				proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));

			// wait for the channel-based event hub to tell us that the
			// instantiate transaction was committed on the peer
			let promises = [];
			let event_hubs = channel.getChannelEventHubsForOrg();
			console.log('found %s eventhubs for this organization %s',event_hubs.length, org_name);
			event_hubs.forEach((eh) => {
				let instantiateEventPromise = new Promise((resolve, reject) => {
					console.log('instantiateEventPromise - setting up event');
					let event_timeout = setTimeout(() => {
						let message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
						console.log(message);
						eh.disconnect();
					}, 60000);
					eh.registerTxEvent(deployId, (tx, code, block_num) => {
						console.log('The chaincode instantiate transaction has been committed on peer %s',eh.getPeerAddr());
						console.log('Transaction %s has status of %s in blocl %s', tx, code, block_num);
						clearTimeout(event_timeout);

						if (code !== 'VALID') {
							let message = util.format('The chaincode instantiate transaction was invalid, code:%s',code);
							console.log(message);
							reject(new Error(message));
						} else {
							let message = 'The chaincode instantiate transaction was valid.';
							console.log(message);
							resolve(message);
						}
					}, (err) => {
						clearTimeout(event_timeout);
						console.log(err);
						reject(err);
					},
						// the default for 'unregister' is true for transaction listeners
						// so no real need to set here, however for 'disconnect'
						// the default is false as most event hubs are long running
						// in this use case we are using it only once
						{unregister: true, disconnect: true}
					);
					eh.connect();
				});
				promises.push(instantiateEventPromise);
			});

			let orderer_request = {
				txId: tx_id, // must include the transaction id so that the outbound
				             // transaction to the orderer will be signed by the admin
							 // id as was the proposal above, notice that transactionID
							 // generated above was based on the admin id not the current
							 // user assigned to the 'client' instance.
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			let sendPromise = channel.sendTransaction(orderer_request);
			// put the send to the orderer last so that the events get registered and
			// are ready for the orderering and committing
			promises.push(sendPromise);
			let results = await Promise.all(promises);
			console.log(util.format('------->>> R E S P O N S E : %j', results));
			let response = results.pop(); //  orderer results are last in the results
			if (response.status === 'SUCCESS') {
				console.log('Successfully sent transaction to the orderer.');
			} else {
				error_message = util.format('Failed to order the transaction. Error code: %s',response.status);
				console.log(error_message);
			}

			// now see what each of the event hubs reported
			for(let i in results) {
				let event_hub_result = results[i];
				let event_hub = event_hubs[i];
				console.log('Event results for event hub :%s',event_hub.getPeerAddr());
				if(typeof event_hub_result === 'string') {
					console.log(event_hub_result);
				} else {
					if(!error_message) error_message = event_hub_result.toString();
					console.log(event_hub_result.toString());
				}
			}
		} else {
			error_message = util.format('Failed to send Proposal and receive all good ProposalResponse');
			console.log(error_message);
		}
	} catch (error) {
		console.log('Failed to send instantiate due to error: ' + error.stack ? error.stack : error);
		error_message = error.toString();
	}

	if (!error_message) {
		let message = util.format(
			'Successfully instantiate chaincode in organization %s to the channel \'%s\'',
			org_name, channelName);
		console.log(message);
		// build a response to send back to the REST caller
		let response = {
			success: true,
			message: message
		};
		return response;
	} else {
		let message = util.format('Failed to instantiate. cause:%s',error_message);
		console.log(message);
		throw new Error(message);
	}
};
exports.instantiateChaincode = instantiateChaincode;
