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
		let axios = require('axios').default
		let helper = require('./helper.js');

		let invokeChaincode = async function (peerNames, channelName, chaincodeName, fcn, args, username, org_name) {
			console.log(util.format('\n============ invoke transaction on channel %s ============\n', channelName));
			console.log(util.format('\n============ invoke transaction on channel %s ============\n', fcn,args));

			let error_message = null;
			let tx_id_string = null;
			try {
				// first setup the client for this org
				let client = await helper.getClientForOrg(org_name, username);
				console.log('Successfully got the fabric client for the organization "%s"', org_name);
				let channel = client.getChannel(channelName);
				// console.log(channel,'channel')
				if (!channel) {
					let message = util.format('Channel %s was not defined in the connection profile', channelName);
					console.log(message);
					throw new Error(message);
				}
				let tx_id = client.newTransactionID();
				// will need the transaction ID string for the event registration later
				tx_id_string = tx_id.getTransactionID();

				let request = {
					targets: peerNames,
					args,
					chaincodeId: chaincodeName,
					chainId: channelName,
					txId: tx_id
				};

				let results = await channel.sendTransactionProposal(request);

				let proposalResponses = results[0];
				let proposal = results[1]; 

				let all_good = true;
				for (let i in proposalResponses) {
					let one_good = false;
					console.log("Logging proposal Responses", proposalResponses[i])
					if (proposalResponses && proposalResponses[i].response &&
						proposalResponses[i].response.status === 200) {
						one_good = true;
						console.log('invoke chaincode proposal was good');
					} else {
						console.log('invoke chaincode proposal was bad');
					}
					all_good = all_good & one_good;
				}

				if (all_good) {
					console.log(util.format(
						'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
						proposalResponses[0].response.status, proposalResponses[0].response.message,
						proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));

					// wait for the channel-based event hub to tell us
					// that the commit was good or bad on each peer in our organization
					let promises = [];
					let event_hubs = channel.getChannelEventHubsForOrg();
					event_hubs.forEach((eh) => {
						console.log('invokeEventPromise - setting up event');
						let invokeEventPromise = new Promise((resolve, reject) => {
							let event_timeout = setTimeout(() => {
								let message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
								console.log(message);
								eh.disconnect();
							}, 50000);
							eh.registerTxEvent(tx_id_string, async (tx, code, block_num) => {
								console.log('The chaincode invoke chaincode transaction has been committed on peer %s', eh.getPeerAddr());
								console.log('Transaction %s has status of %s in blocl %s', tx, code, block_num);
								console.log('Getting transaction for transaction ID %s', tx)

								clearTimeout(event_timeout);

								if (code !== 'VALID') {
									let message = util.format('The invoke chaincode transaction was invalid, code:%s', code);
									console.log(message);
									reject(new Error(message));
								} else {
									let message = 'The invoke chaincode transaction was valid.';
									console.log(message);
									resolve(message);
								}
							}, (err) => {
								clearTimeout(event_timeout);
								console.log(err);
								reject(err);
							},

								{ unregister: true, disconnect: true }
							);
							eh.connect();
						});
						promises.push(invokeEventPromise);
					});

					let orderer_request = {
						txId: tx_id,
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
						error_message = util.format('Failed to order the transaction. Error code: %s', response.status);
						console.log(error_message);
					}

					// now see what each of the event hubs reported
					for (let i in results) {
						let event_hub_result = results[i];
						let event_hub = event_hubs[i];
						console.log('Event results for event hub :%s', event_hub.getPeerAddr());
						if (typeof event_hub_result === 'string') {
							console.log(event_hub_result);
						} else {
							if (!error_message) error_message = event_hub_result.toString();
							console.log(event_hub_result.toString());
						}
					}
				} else {
					error_message = util.format('Failed to send Proposal and receive all good ProposalResponse');
					console.log(error_message);
				}
			} catch (error) {
				console.log('Failed to invoke due to error: ' + error.stack ? error.stack : error);
				error_message = error.toString();
			}

			if (!error_message) {
				let message = util.format(
					'Successfully invoked the chaincode %s to the channel \'%s\' for transaction ID: %s',
					org_name, channelName, tx_id_string);
				console.log(message);

				return { "tx_id": tx_id_string };
			} else {
				let message = util.format('Failed to invoke chaincode. cause:%s', error_message);
				console.log(message);
				throw new Error(message);
			}
		};



		exports.invokeChaincode = invokeChaincode;
