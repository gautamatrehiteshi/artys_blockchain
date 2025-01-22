const util = require('util');
const helper = require('./helper.js');

const approveChaincode = async (channelName, chaincodeName, chaincodeVersion, packageId, orgName, username,  endorsementPolicy) => {
    try {
        console.log(`\n============ Approving chaincode definition on channel ${channelName} ============\n`);
        
        const client = await helper.getClientForOrg(orgName, username);
        const channel = client.getChannel(channelName);
        if (!channel) {
            throw new Error(`Channel ${channelName} was not defined in the connection profile.`);
        }

        const txId = client.newTransactionID();
        const request = {
            chaincodeId: chaincodeName,
            chaincodeVersion: chaincodeVersion,
            txId,
            packageId,
            channelName,
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

        const response = await channel.approveChaincodeDefinitionForMyOrg(request);

        if (response && response.status === 'SUCCESS') {
            console.log(`Successfully approved chaincode ${chaincodeName} on channel ${channelName} for org ${orgName}`);
        } else {
            throw new Error(`Failed to approve chaincode definition. Response: ${JSON.stringify(response)}`);
        }
    } catch (error) {
        console.error(`Error approving chaincode: ${error.message}`);
        throw error;
    }
};
module.exports = approveChaincode;