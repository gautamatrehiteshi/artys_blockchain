# Initial Setup
To create a hyperledger fabric network, follow the steps below:
1. Move to directory BasicNetwork-2.0->artifacts-> channel->config
2. Run the `./script.sh` command.This will download all the binaries required to create a fabric.
3. Run `pwd`command in terminal and copy the path
4. Run command `sudo nano ~/.bashrc` 
5. At the end of the file add this line ` export PATH="$PATH:<copied value from step 3>/fabric-samples/bin" `and save the file.Close the terminal.
6. Open a new terminal and move to directory BasicNetwork-2.0->artifacts-> channel.Run the command `./create-artifacts.sh`. 
This will generate the crypto configurations folder and the necessary required files to instantiate a network.
This will also create genesis block and Organization files.
7. After ensuring that these configurations are created again move to  BasicNetwork-2.0->artifacts directory.
8. Run `docker compose up -d `command in order to up your network.
9. Initially upon running the command it will pull the fabric dependencies required to up your network.
Note: We might need to generate/create keyring and run this command, if there are any errors.
10. Ensure that docker container for all the peers by running docker ps command, couch db are running which are defined in the configtx.yaml file.
# Creating and joining channel
1. After ensuring that docker containers are running smoothly, move the directory BasicNetwork-2.0.
2. Modify the createChannel.sh file and enable the createChannel function at the end of the file and comment out rest of the function.
3. Run command `./createChannel.sh ` after the above step.
4. After the channel has been created successfully, the peers are ready to join the channel.
5. To make the peers join the channel again modify the createChannel.sh file and comment out the createChannel at the end of the file.
6. Enable the commented out joinChannel function and execute the `./createChannel` command.
7. The peers will successfully join the channel upon running the command.


# Setting up Chaincode for the network

1. Move to directory BasicNetwork-2.0->artifacts->channel->src->github.com.
2. Copy your updated chaincode here( if required).
3. Move back to directory  BasicNetwork-2.0.
4. Open deployChaincode.sh file.
5. Change the configurations of presetup function( if necessary).
9. Enusre the variable CC_SRC_PATH in deployChaincode file points to the path where your chaincode is presetup.
7. Run command `./deployChaincode.sh` after the above step.

# Functions defined in deployChaincode file


1. "packageChaincode" - This will create a zip file for the chaincode which will be utilized to deploy the chaincode.

2. "installChaincode" - This function will ensure that chaincode is installed on the given channel for all the peers available.

3.  "queryInstalled" - This function will ensure that chaincode is installed properly on all the peers and will provide the package id and description provided for the chaincode.

4. "approveForMyOrg1" - This function will ensure that the installed chaincode is approved by the first organization and the peer as the 
chaincode definition can only be changed when majority of user approve the new chaincode definition.

5. "approveForMyOrg2"- same as point 4.

6. "checkCommitReadyness" - This function will return an object with the boolean values containing the approval of different organization peers.

7.  "commitChaincodeDefinition" - This function will ensure that the  approved chaincode is installed everywhere on the chain.

8. "queryCommitted" - This function checks the current status of a chaincode that has been committed to a channel. It provides information about the chaincode, such as its name, version, and sequence number, which is useful for debugging, verification, and managing chaincode..

9. "chaincodeInvokeInit" - This function is called to initialize the chaincode.

10. "chaincodeInvoke" - This function is used to create a transaction on the fabric.We can see the transactions on  [localhost:5984](http://0.0.0.0:5984/_utils). This is a couch db instance.