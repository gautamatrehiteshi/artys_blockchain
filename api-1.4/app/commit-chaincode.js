const util = require('util');
const helper = require('./helper.js');
const commitChaincode = async (channelName, chaincodeName, chaincodeVersion, orgName, username, sequence, endorsementPolicy) => {
    try {
        console.log(`\n============ Committing chaincode definition on channel ${channelName} ============\n`);
        
        const client = await helper.getClientForOrg(orgName, username);
        const channel = client.getChannel(channelName);
        if (!channel) {
            throw new Error(`Channel ${channelName} was not defined in the connection profile.`);
        }

        const txId = client.newTransactionID();
        const request = {
            chaincodeId: chaincodeName,
            chaincodeVersion: chaincodeVersion,
            sequence: sequence,
            txId,
            channelName,
            policy: endorsementPolicy,
        };

        const response = await channel.commitChaincodeDefinition(request);

        if (response && response.status === 'SUCCESS') {
            console.log(`Successfully committed chaincode ${chaincodeName} on channel ${channelName}`);
        } else {
            throw new Error(`Failed to commit chaincode definition. Response: ${JSON.stringify(response)}`);
        }
    } catch (error) {
        console.error(`Error committing chaincode: ${error.message}`);
        throw error;
    }
};

module.exports = commitChaincode;