# Initial Setup
To create a hyperledger fabric network, follow the steps below:
1. Move to directory BasicNetwork-2.0->artifacts-> channel
2. Run the shell file ./create-artifacts.sh 
This will generate the crypto configurations folder and the necessary required files to instantiate a network.
This will also create genesis block and Organization files.
3. After ensuring that these configurations are created again move to  BasicNetwork-2.0->artifacts directory.
4. Run docker compose up -d command in order to up your network.
5. Initially upon running the command it will pull the fabric dependencies required to up your network.
Note: We might need to generate/create keyring and run this command, if there are any errors.
6. Ensure that docker container for all the peers by running docker ps command, couch db are running which are defined in the configtx.yaml file.
# Creating and joining channel
7. After ensuring that docker containers are running smoothly, move the directory BasicNetwork-2.0.
8. Modify the createChannel.sh file and enable the createChannel function at the end of the file and comment out rest of the function.
9. Run command ./createChannel.sh after the above step.
10. After the channel has been created successfully, the peers are ready to join the channel.
11. To make the peers join the channel again modify the createChannel.sh file and comment out the createChannel at the end of the file.
12. Enable the commented out joinChannel function and execute the ./createChannel file.
13. The peers will successfully join the channel upon running the command.


# Setting up Chaincode for the network

1. Move to directory BasicNetwork-2.0->artifacts->channel->src->github.com.
2. Copy your updated chaincode here( if required).
3. Move back to directory  BasicNetwork-2.0.
4. Open deployChaincode.sh file.
5. Change the configurations of presetup function( if necessary).
6. At the end of the file. comment out the rest of the functions except "presetup".
7. Run command ./deployChaincode.sh after the above step.
8. The above command will install all the node js packages required for chaincode setup in the BasicNetwork-2.0->artifacts->src->github.com->chaincode_artys folder.
9. Enusre the variable CC_SRC_PATH in deployChaincode file points to the path where your chaincode is presetup.
10. After that, we comment out the all the functions except "packageChaincode" and run the ./deployChaincode.sh command in terminal.This will create a zip file for the chaincode which will be utilized to deploy the chaincode.
11. After that, we comment out the all the functions except "installChaincode" and run the ./deployChaincode.sh command in terminal.This function will ensure that chaincode is installed on the given channel for all the peers available.
12. After that, we comment out the all the functions except "queryInstalled" and run the ./deployChaincode.sh command in terminal.This function will ensure that chaincode is installed properly on all the peers and will provide the package id and description provided for the chaincode.
13. After that, we comment out the all the functions except "approveForMyOrg1" and run the ./deployChaincode.sh command in terminal.This function will ensure that the installed chaincode is approved by the first organization and the peer as the chaincode definition can only be changed when majority of user approve the new chaincode definition.
14. Repeat the same steps for "approveForMyOrg2" as above.
15. When the above steps are completed without any errors, then we can run  ./deployChaincode.sh file by commenting all the functions except "checkCommitReadyness". This function will return an object with the boolean values containing the approval of different organization peers.
16. After that, we comment out the all the functions except "commitChaincodeDefinition" and run the ./deployChaincode.sh command in terminal.This function will ensure that the  approved chaincode is installed everywhere on the chain.
17. The "queryCommitted" function checks the current status of a chaincode that has been committed to a channel. It provides information about the chaincode, such as its name, version, and sequence number, which is useful for debugging, verification, and managing chaincode.(Optional).
18. After that "chaincodeInvokeInit" function can be called to initialize the chaincpode by running the ./deployChaincode.sh file and commenting out rest of the functions.
19.  The "chaincodeInvoke" is used to create a transaction on the fabric.We can see the transactions on  [localhost:5984](http://0.0.0.0:5984/_utils). This is a couch db instance.