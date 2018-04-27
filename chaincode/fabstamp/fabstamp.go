/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * The sample smart contract for Stamp Paper Application:
 * 
 */

package main

/* Imports
 * 4 utility libraries for formatting, handling bytes, reading and writing JSON, and string manipulation
 * 2 specific Hyperledger Fabric specific libraries for Smart Contracts
 */
import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

// Define the Smart Contract structure
type SmartContract struct {
}

type Signature struct {
	Type int `json:"type"`
	Sign string `json:"sign"`	
	}
// Define the Stamp structure, with 6 properties.  Structure tags are used by encoding/json library
type Stamp struct {
	Date   string `json:"date"`
	Timestamp int64 `json:"timestamp"`	
	Instrument  string `json:"instrument"`
	State  string `json:"state"`
	Attachments []string `json:"attachments"`
	Signatures []Signature `json:"signatures"`
}
// Make Timestamp - create a timestamp in ms
func makeTimestamp() int64 {
    return time.Now().UnixNano() / (int64(time.Millisecond)/int64(time.Nanosecond))
}

/*
 * The Init method is called when the Smart Contract "fabstamp" is instantiated by the blockchain network
 * Best practice is to have any Ledger initialization in separate function -- see initLedger()
 */
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

/*
 * The Invoke method is called as a result of an application request to run the Smart Contract "fabstamp"
 * The calling application program has also specified the particular smart contract function to be called, with arguments
 */
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()
	// Route to the appropriate handler function to interact with the ledger appropriately
	if function == "queryStamp" {
		return s.queryStamp(APIstub, args)
	} else if function == "initLedger" {
		return s.initLedger(APIstub)
	} else if function == "createStamp" {
		return s.createStamp(APIstub, args)
	} else if function == "readEverything" {
		return s.readEverything(APIstub, args)
	}else if function == "getHistory" {
		return s.getHistory(APIstub, args)
		}
	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) queryStamp(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	stampAsBytes, err := APIstub.GetState(args[0])
	if err != nil {
		return shim.Error("Incorrect key")
	}
	
	return shim.Success(stampAsBytes)
	
	
}

func (s *SmartContract) initLedger(APIstub shim.ChaincodeStubInterface) sc.Response {
	stamps := []Stamp{
		Stamp{Date : "14-05-2015",Instrument:"instrument1",Attachments:[]string{"attachment1","attachment2"},State:"Rajasthan",Timestamp:makeTimestamp(),
			Signatures: []Signature{ Signature{Sign : "I am sign1",Type:0},Signature{Sign:"I am sign2",Type : 1} } },
		Stamp{Date : "14-03-2018",Instrument:"instrument2",Attachments:[]string{"attachment3","attachment4"},State:"Punjab",Timestamp:makeTimestamp(),
			Signatures: []Signature{ Signature{Sign : "I am sign3",Type:0},Signature{Sign:"I am sign4",Type : 1} }}}

	i := 0
	for i < len(stamps) {
		fmt.Println("i is ", i)
		stampAsBytes, _ := json.Marshal(stamps[i])
		fmt.Println(stampAsBytes);
		APIstub.PutState("Stamp"+strconv.Itoa(i), stampAsBytes)
		fmt.Println("Added", stamps[i])
		i = i + 1
	}

	return shim.Success(nil)
}

func (s *SmartContract) createStamp(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) < 5 {
		return shim.Error("Incorrect number of arguments. Expecting At least 5")
	}
	lenattach, err := strconv.Atoi(args[3])
	if(err!= nil){
		return shim.Error("Incorrect array length")
		}
	i:=0
	 attachments := make([]string, lenattach);
	for i<lenattach{
		attachments[i] = args[i+4]
		i = i+1
		}
		i  = i+3 
	state :=args[i+1]
	
	signlength ,err1:= strconv.Atoi(args[i+2])
	if(err1!= nil){
		return shim.Error("Incorrect sign length")
		}
	 signatures := make([]Signature, signlength);
	i = i + 2
	j := 0
	for j< signlength{
		typevar,err2:=strconv.Atoi(args[i+2])
		if(err2!= nil){
		return shim.Error("Incorrect sign type in argument")
		}
		signatures[j] = Signature{Sign:args[i+1],Type:typevar}
		i = i+2 
		j = j+1
		}
	
	
	var stamp = Stamp{Date : args[1],Instrument:args[2],Attachments:attachments,State:state,Signatures: signatures,Timestamp:makeTimestamp()}
	fmt.Println("Added", stamp)
	stampAsBytes, _ := json.Marshal(stamp)
	APIstub.PutState(args[0], stampAsBytes)

	return shim.Success(nil)
}

func (s *SmartContract) readEverything(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	
	type Everything struct {
		Stamps  []Stamp  `json:"stamps"`
		Keys    []string `json:"keys"`
	}
	var everything Everything
	resultsIterator, err := APIstub.GetStateByRange("Stamp0", "Stamp9999999999999999999")
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()
	for resultsIterator.HasNext() {
		aKeyValue, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		queryKeyAsStr := aKeyValue.Key
		queryValAsBytes := aKeyValue.Value
		fmt.Println("on stamp id - ", queryKeyAsStr)
		var stamp Stamp
		json.Unmarshal(queryValAsBytes, &stamp)                  //un stringify it aka JSON.parse()
		everything.Stamps = append(everything.Stamps, stamp)   //add this marble to the list
		everything.Keys = append(everything.Keys, queryKeyAsStr)   //add this key to the list
	}
		//change to array of bytes
	everythingAsBytes, _ := json.Marshal(everything)              //convert to array of bytes
	return shim.Success(everythingAsBytes)		
	
}

func (s *SmartContract) getHistory(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	type AuditHistory struct {
		TxId    string   `json:"txId"`
		Value   Stamp   `json:"value"`
	}
	var history []AuditHistory;
	var stamp Stamp
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	stampId := args[0]
	resultsIterator, err := APIstub.GetHistoryForKey(stampId)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()
	for resultsIterator.HasNext() {
		historyData, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		var tx AuditHistory
		tx.TxId = historyData.TxId                     //copy transaction id over
		json.Unmarshal(historyData.Value, &stamp)     //un stringify it aka JSON.parse()
		if historyData.Value == nil {                  //marble has been deleted
			var emptyStamp Stamp
			tx.Value = emptyStamp                 //copy nil marble
		} else {
			json.Unmarshal(historyData.Value, &stamp) //un stringify it aka JSON.parse()
			tx.Value = stamp                      //copy marble over
		}
		history = append(history, tx)              //add this tx to the list
	}
	//change to array of bytes
	historyAsBytes, _ := json.Marshal(history)     //convert to array of bytes
	return shim.Success(historyAsBytes)
}



// The main function is only relevant in unit test mode. Only included here for completeness.
func main() {

	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
