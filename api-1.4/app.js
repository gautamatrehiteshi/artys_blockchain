/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';

// let logger = log4js.getLogger('SampleWebApp');
let express = require('express');
let bodyParser = require('body-parser');
let http = require('http');
let util = require('util');
let app = express();
// let expressJWT = require('express-jwt');
let jwt = require('jsonwebtoken');
let bearerToken = require('express-bearer-token');
let cors = require('cors');
const prometheus = require('prom-client')

require('./config.js');
let hfc = require('fabric-client');

let helper = require('./app/helper.js');
let createChannel = require('./app/create-channel.js');
let join = require('./app/join-channel.js');
let install = require('./app/install-chaincode.js');
let instantiate = require('./app/instantiate-chaincode.js');
let invoke = require('./app/invoke-transaction.js');
let query = require('./app/query.js');
let host = process.env.HOST || hfc.getConfigSetting('host');
let port = process.env.PORT || hfc.getConfigSetting('port');


app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));
// set secret letiable
app.set('secret', 'secret');
// app.use(expressJWT({
// 	secret: 'thisismysecret'
// }).unless({
// 	path: ['/users', '/metrics']
// }));
app.use(bearerToken());
app.use(function (req, res, next) {
	console.log(' ------>>>>>> new request for %s', req.originalUrl,req.token);
	if (req.originalUrl.indexOf('/users') >= 0 || req.originalUrl.indexOf('/metrics') >= 0) {
		return next();
	}

	let token = req.token;
	jwt.verify(token, 'secret', function (err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /users call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.username = decoded.username;
			req.orgname = decoded.orgName;
			console.log(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
let server = http.createServer(app).listen(port, function () { });
console.log('****************** SERVER STARTED ************************');
console.log('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

function getErrorMessage(field) {
	let response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Register and enroll user



app.post('/users', async function (req, res) {
	let username = req.body.username;
	let orgName = req.body.orgName;
	console.log('End point : /users');
	console.log('User name : ' + username);
	console.log('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	let token = jwt.sign({
		exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
		username: username,
		orgName: orgName
	}, 'secret');
	let response = await helper.getRegisteredUser(username, orgName, true);
	console.log('-- returned from registering the username %s for organization %s', username, orgName);
	if (response && typeof response !== 'string') {
		console.log('Successfully registered the username %s for organization %s', username, orgName);
		response.token = token;
		res.json(response);
	} else {
		console.log('Failed to register the username %s for organization %s with::%s', username, orgName, response);
		res.json({ success: false, message: response });
	}

});
// Create Channel
app.post('/channels', async function (req, res) {
	console.log('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	console.log('End point : /channels');
	let channelName = req.body.channelName; 
	let channelConfigPath = req.body.channelConfigPath;
	console.log('Channel name : ' + channelName);
	console.log('channelConfigPath : ' + channelConfigPath); //../artifacts/channel/mychannel.tx
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!channelConfigPath) {
		res.json(getErrorMessage('\'channelConfigPath\''));
		return;
	}

	let message = await createChannel.createChannel(channelName, channelConfigPath, req.username, req.orgname);
	res.send(message);
});

// Join Channel
app.post('/channels/:channelName/peers', async function (req, res) {
	console.log('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	let channelName = req.params.channelName;
	let peers = req.body.peers;
	console.log('channelName : ' + channelName);
	console.log('peers : ' + peers);
	console.log('username :' + req.username);
	console.log('orgname:' + req.orgname);

	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}

	let message = await join.joinChannel(channelName, peers, req.username, req.orgname);
	res.send(message);
});


// Install chaincode on target peers
app.post('/chaincodes', async function (req, res) {
	console.log('==================== INSTALL CHAINCODE ==================');
	let peers = req.body.peers;
	let chaincodeName = req.body.chaincodeName;
	let chaincodePath = req.body.chaincodePath;
	let chaincodeVersion = req.body.chaincodeVersion;
	let chaincodeType = req.body.chaincodeType;
	console.log('peers : ' + peers); // target peers list
	console.log('chaincodeName : ' + chaincodeName);
	console.log('chaincodePath  : ' + chaincodePath);
	console.log('chaincodeVersion  : ' + chaincodeVersion);
	console.log('chaincodeType  : ' + chaincodeType);
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodePath) {
		res.json(getErrorMessage('\'chaincodePath\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgname)
	res.send(message);
});
// Query to fetch all Installed/instantiated chaincodes

app.get('/chaincodes', async function (req, res) {
	let peer = req.query.peer;
	let installType = req.query.type;
	console.log('================ GET INSTALLED CHAINCODES ======================');

	let message = await query.getInstalledChaincodes(peer, null, 'installed', req.username, req.orgname)
	res.send(message);
});
//Query for Channel instantiated chaincodes
app.get('/channels/:channelName/chaincodes', async function (req, res) {
	console.log('================ GET INSTANTIATED CHAINCODES ======================');
	console.log('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', req.username, req.orgname);
	res.send(message);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////WORKING////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Instantiate chaincode on target peers
app.post('/channels/:channelName/chaincodes', async function (req, res) {
	console.log('==================== INSTANTIATE CHAINCODE ==================');
	let peers = req.body.peers;
	let chaincodeName = req.body.chaincodeName;
	let chaincodeVersion = req.body.chaincodeVersion;
	let channelName = req.params.channelName;
	let chaincodeType = req.body.chaincodeType;
	let fcn = req.body.fcn;
	let args = req.body.args;
	console.log('peers  : ' + peers);
	console.log('channelName  : ' + channelName);
	console.log('chaincodeName : ' + chaincodeName);
	console.log('chaincodeVersion  : ' + chaincodeVersion);
	console.log('chaincodeType  : ' + chaincodeType);
	console.log('fcn  : ' + fcn);
	console.log('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await instantiate.instantiateChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
	res.send(message);
});



// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
	try {
		console.log('==================== INVOKE ON CHAINCODE ==================');
		let peers = req.body.peers;
		let chaincodeName = req.params.chaincodeName;
		let channelName = req.params.channelName;
		let fcn = req.body.fcn;
		let args = req.body.args;

		console.log('channelName  : ' + channelName);
		console.log('chaincodeName : ' + chaincodeName);
		console.log('fcn  : ' + fcn);
		console.log('args  : ' + args);
		if (!chaincodeName) {
			res.json(getErrorMessage('\'chaincodeName\''));
			return;
		}
		if (!channelName) {
			res.json(getErrorMessage('\'channelName\''));
			return;
		}

		const start = Date.now();
			let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgname);
		const latency = Date.now() - start;


		const response_payload = {
			result: message,
			error: null,
			errorData: null
		}
		res.send(response_payload);

	} catch (error) {
		const response_payload = {
			result: null,
			error: error.name,
			errorData: error.message
		}
		res.send(response_payload)
	}
});


// Query on chaincode on target peers
app.get('/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
	console.log('==================== QUERY BY CHAINCODE ==================');
	let channelName = req.params.channelName;
	let chaincodeName = req.params.chaincodeName;
	let args = req.query.args;
	let fcn = req.query.fcn;
	let peer = req.query.peer;

	console.log('channelName : ' + channelName);
	console.log('chaincodeName : ' + chaincodeName);
	// console.log('fcn : ' + fcn);
	// console.log('args : ' + args);

	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	// if (!fcn) {
	// 	res.json(getErrorMessage('\'fcn\''));
	// 	return;
	// }
	// if (!args) {
	// 	res.json(getErrorMessage('\'args\''));
	// 	return;
	// }
	// args = args.replace(/'/g, '"');
	// args = JSON.parse(args);
	// console.log(args);

	// let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	let message = await query.queryChaincode(peer, channelName, chaincodeName,  req.username, req.orgname);

	res.send(message);
});

//  Query Get Block by BlockNumber
app.get('/channels/:channelName/blocks/:blockId', async function (req, res) {
	console.log('==================== GET BLOCK BY NUMBER ==================');
	let blockId = req.params.blockId;
	let peer = req.query.peer;
	console.log('channelName : ' + req.params.channelName);
	console.log('BlockID : ' + blockId);
	console.log('Peer : ' + peer);
	if (!blockId) {
		res.json(getErrorMessage('\'blockId\''));
		return;
	}

	let message = await query.getBlockByNumber(peer, req.params.channelName, blockId, req.username, req.orgname);
	res.send(message);
});

// Query Get Transaction by Transaction ID
app.get('/channels/:channelName/transactions/:trxnId', async function (req, res) {
	console.log('================ GET TRANSACTION BY TRANSACTION_ID ======================');
	console.log('channelName : ' + req.params.channelName);
	let trxnId = req.params.trxnId;
	let peer = req.query.peer;
	if (!trxnId) {
		res.json(getErrorMessage('\'trxnId\''));
		return;
	}

	let message = await query.getTransactionByID(peer, req.params.channelName, trxnId, req.username, req.orgname);
	res.send(message);
});
// Query Get Block by Hash
app.get('/channels/:channelName/blocks', async function (req, res) {
	console.log('================ GET BLOCK BY HASH ======================');
	console.log('channelName : ' + req.params.channelName);
	let hash = req.query.hash;
	let peer = req.query.peer;
	if (!hash) {
		res.json(getErrorMessage('\'hash\''));
		return;
	}

	let message = await query.getBlockByHash(peer, req.params.channelName, hash, req.username, req.orgname);
	res.send(message);
});
//Query for Channel Information
app.get('/channels/:channelName', async function (req, res) {
	console.log('================ GET CHANNEL INFORMATION ======================');
	console.log('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getChainInfo(peer, req.params.channelName, req.username, req.orgname);
	res.send(message);
});


// Query to fetch channels
app.get('/channels', async function (req, res) {
	console.log('================ GET CHANNELS ======================');
	console.log('peer: ' + req.query.peer);
	let peer = req.query.peer;
	if (!peer) {
		res.json(getErrorMessage('\'peer\''));
		return;
	}

	let message = await query.getChannels(peer, req.username, req.orgname);
	res.send(message);
});


module.exports = app
