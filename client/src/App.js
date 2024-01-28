import React, { useEffect, useState } from 'react';
import WoodSupplyChain from './contracts/WoodSupplyChain.json';
import { getWeb3 } from './utils.js';
import './App.css';
import Modal from 'react-modal';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '50vw',  
    maxWidth: '90vw',
    height: '40vw', 
    maxHeight: '70vw'
  },
};

const customStylesSmall = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '50vw',  
    maxWidth: '70vw',
    height: '20vw', 
    maxHeight: '30vw'
  },
};

const COORDINATE_PRECISION = 5
const PRICE_PRECISION = 2

Modal.setAppElement('#root');

function App() {
  const [web3, setWeb3] = useState(undefined);
  const [accounts, setAccounts] = useState(undefined);
  const [contract, setContract] = useState(undefined);
  const [admin, setAdmin] = useState(undefined);
  const [batches, setBatches] = useState([]);
  const [isHandler, setIsHandler] = useState(false);
  const [myBatches, setMyBatches] = useState([]);
  const [transferModalIsOpen, setIsOpenTransfer] = React.useState(false);
  const [shiftModalIsOpen, setIsOpenShift] = React.useState(false);
  const [historyModalIsOpen, setIsOpenHistory] = React.useState(false);
  const [selectedBatch, setSelectedBatch] = useState(undefined)
  const [locations, setLocations] = useState([])
  const [handlers, setHandlers] = useState([])
  
  let subtitle;
  
  function openTransferModal(batchId) {
    setSelectedBatch(batchId)
    setIsOpenTransfer(true);
  }

  function closeTransferModal() {
    setIsOpenTransfer(false);
  }

  function openShiftModal(batchId) {
    setSelectedBatch(batchId)
    setIsOpenShift(true);
  }

  function closeShiftModal() {
    setIsOpenShift(false);
  }

  async function openHistoryModal(batchId) {
    await trackBatch(batchId)
    setSelectedBatch(batchId)
    setIsOpenHistory(true);
  }

  function closeHistoryModal() {
    setIsOpenHistory(false);
  }

  function afterOpenModal() {
    subtitle.style.color = '#f00';
  }

  function multiplyForPrecision(x, precision){
    return parseInt(x * 10 ** precision)
  }

  function divideForPrecision(x, precision){
    return parseFloat(x / 10 ** precision)
  }
  

  useEffect(() => {
    const init = async () => {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = WoodSupplyChain.networks[networkId];
      const contract = new web3.eth.Contract(
        WoodSupplyChain.abi,
        deployedNetwork && deployedNetwork.address,
      );
      const admin = await contract.methods.admin().call();
      const isHandler = await checkIfHandler(contract, accounts[0])
      setWeb3(web3);
      setAccounts(accounts);
      setContract(contract);
      setAdmin(admin);
      setIsHandler(isHandler);
    }
    init();
    window.ethereum.on('accountsChanged', async (accounts) => {
      setAccounts(accounts);
      if(transferModalIsOpen)
        closeTransferModal()
      if(shiftModalIsOpen)  
        closeShiftModal()
      if(historyModalIsOpen)
        closeHistoryModal()    

    });
  }, []);

  const isReady = () => {
    return (
      typeof contract !== 'undefined' 
      && typeof web3 !== 'undefined'
      && typeof accounts !== 'undefined'
      && typeof admin !== 'undefined'
    );
  }

  useEffect(() => {
    if(isReady()) {
      updateHandler();
      updateBatches();
      updateMyBatches();
    }
  }, [accounts, contract, web3, admin]);

  async function updateBatches() {
    const nextId = parseInt(await contract.methods.nextBatchId().call());
    const batches = [];
    for(let i = 0; i < nextId; i++) { 
      let batch = await contract.methods.batches(i).call()
      batch.currlat = divideForPrecision(batch.currlat, COORDINATE_PRECISION);
      batch.currlon = divideForPrecision(batch.currlon, COORDINATE_PRECISION)
      batch.batchPrice = divideForPrecision(batch.batchPrice, PRICE_PRECISION)
      batches.push(batch)
    }
    
    setBatches(await Promise.all(batches));
  }

  if (!isReady()) {
    return <div>Loading...</div>;
  }


  async function addHandlers(e){
    e.preventDefault()
    let address = e.target.elements[0].value;
    let check = await checkIfHandler(contract, address);
    if(check){
      alert('Address is already a verified handler !')
      return 
    }
      
    await contract.methods.addHandler(address).send({from: accounts[0]});
  }

  async function checkIfHandler(contract, account){
    let check = await contract.methods.handlers(account).call()
    return check
  }

  async function checkHandler(e){
    e.preventDefault()
    let add = e.target.elements[0].value
    let check = await checkIfHandler(contract, add);
    if(check)
      alert('Address is a verified handler !')
    else 
      alert('Address is not a verified handler !')  
  }

  async function updateHandler(){
    let check = await contract.methods.handlers(accounts[0]).call()
    setIsHandler(check)
  }

  async function addBatch(e){
    e.preventDefault()
    let lat = parseFloat(e.target.elements[0].value)
    lat = multiplyForPrecision(lat, COORDINATE_PRECISION)
    let lon = parseFloat(e.target.elements[1].value)
    lon = multiplyForPrecision(lon, COORDINATE_PRECISION)
    let region = e.target.elements[2].value
    let type = e.target.elements[3].value
    let price = parseFloat(e.target.elements[4].value)
    let quantity = parseFloat(e.target.elements[5].value)

    price = multiplyForPrecision(price, PRICE_PRECISION)
    await contract.methods.createBatch(lat, lon, region, type, price, quantity).send({from: accounts[0]});
    await updateMyBatches()
    await updateBatches()
    document.getElementById("addForm").reset();
  }

  async function updateMyBatches(){
    const nextId = parseInt(await contract.methods.nextBatchId().call());
    const myBatches = [];
    for(let i = 0; i < nextId; i++) { 
      let batch = await contract.methods.batches(i).call()
      if(batch.handler.toLowerCase() === accounts[0].toLowerCase()){
        batch.currlat = divideForPrecision(batch.currlat, COORDINATE_PRECISION);
        batch.currlon = divideForPrecision(batch.currlon, COORDINATE_PRECISION)
        batch.batchPrice = divideForPrecision(batch.batchPrice, PRICE_PRECISION)
        myBatches.push(batch)
      }
        
    }
    setMyBatches(myBatches)
  }

  async function onTransferHandler(e){
    e.preventDefault()
    let newAddress = e.target.elements[0].value

    let check = await checkIfHandler(contract, newAddress);
    if(!check){
      alert('Address is not a verified handler !')
      return 
    }
    await contract.methods.changeHandler(selectedBatch, newAddress).send({from: accounts[0]});
    updateMyBatches()
    closeTransferModal()
    updateBatches()
  }

  async function onShiftBatch(e){
    e.preventDefault()
    let newlat = parseFloat(e.target.elements[0].value)
    newlat = multiplyForPrecision(newlat, COORDINATE_PRECISION)
    let newlon = parseFloat(e.target.elements[1].value)
    newlon = multiplyForPrecision(newlon, COORDINATE_PRECISION)
    let newHandler = e.target.elements[2].value
    let check = await checkIfHandler(contract, newHandler);
    if(!check){
      alert('Address is not a verified handler !')
      return 
    }
    await contract.methods.moveBatch(selectedBatch, newlat, newlon, newHandler).send({from: accounts[0]});
    updateMyBatches()
    closeShiftModal()
    updateBatches()
  }

  async function trackBatch(batchId){
    let locations = [],  handlers = [];
    let stage = batches[batchId]['stage']

    for(let i=0; i<=stage; i++){
      let lat = await contract.methods.latTrack(batchId, i).call()
      lat = divideForPrecision(lat, COORDINATE_PRECISION)
      let lon = await contract.methods.lonTrack(batchId, i).call()
      lon = divideForPrecision(lon, COORDINATE_PRECISION)
      let handler = await contract.methods.handlerTrack(batchId, i).call();
      locations.push({lat : lat, lon : lon, addr: handler})

    }
    setLocations(locations)
  }

  async function verifyQuantity(batchId){
    let check = batches[batchId]['transferAccepted'];
    if(check == true)
      return
    
    await contract.methods.verifyBatch(batchId).send({from: accounts[0]});
    updateMyBatches()
  }

  return (
    <div className="container">
      <br/>  <hr/>
      <h1 className="text-center"> Supply chain management of Wooden logs </h1>
      <hr/>

      <br/>
      <div style={{float:"right"}} > Connected Account : </div> <br/>
      <div style={{float:"right"}} > {accounts[0]} </div>
        {accounts[0].toLowerCase() === admin.toLowerCase() ? (
          <>
          <div>
          <h2>Check Handler</h2> <br/>
            <form onSubmit={e => checkHandler(e)}>
                <div className="form-group" className="col-sm-5">
                  <label htmlFor="lat">Enter an address : </label>
                  <input type="text" className="form-control" id="add1" autoComplete="off"/><br/>
                  <span style={{float:"left"}}> <button type="submit" className="btn btn-primary"> check </button> </span>
                </div>
                
            </form> 
          </div><br/><br/><br/><hr/>
          <div className="row">
            <div className="col-sm-12">
              <h2>Add new Handler</h2>
              <form onSubmit={e => addHandlers(e)}>
                <div className="form-group">
                  <label htmlFor="handlerAddress">Handler address</label>
                  <input type="text" className="form-control" id="handlers" autoComplete="off"/>
                </div>
                <button type="submit" className="btn btn-primary">Submit</button>
              </form>
            </div>
          </div>
          <hr/>
          </>
        ) : null}
      
        { isHandler == true && accounts[0].toLowerCase() !== admin.toLowerCase() ? (
          <>
          <div>
          <h2>Check Handler</h2> <br/>
            <form onSubmit={e => checkHandler(e)}>
                <div className="form-group" className="col-sm-5">
                  <label htmlFor="lat">Enter an address : </label>
                  <input type="text" className="form-control" id="add1" autoComplete="off"/><br/>
                  <span style={{float:"left"}}> <button type="submit" className="btn btn-primary"> check </button> </span>
                </div>
                
            </form> 
          </div><br/><br/><br/><hr/>
          <div className="row">
            <div className="col-sm-8">
              <h2>Add new Batch</h2> <br/>
              <form id='addForm' onSubmit={e => addBatch(e)}>
                <div className="form-group" className="col-sm-5" style={{float:"left"}}>
                  <label htmlFor="lat">Current Latitude : </label>
                  <input type="number" step="0.000001" className="form-control" id="lat" autoComplete="off"/>
                </div>
                <div className="form-group" className="col-sm-5" style={{float:"right"}}>
                  <label htmlFor="lon">Current Longitude : </label>
                  <input type="number" step="0.000001" className="form-control" id="lon" autoComplete="off"/>
                </div>
                <div className="form-group" className="col-sm-5" style={{float:"left"}} ><br/>
                  <label htmlFor="origin"> Origin region : </label>
                  <input type="text" className="form-control" id="origin" autoComplete="off"/>
                </div>
                <div className="form-group" className="col-sm-5" style={{float:"right"}}> <br/>
                  <label htmlFor="type">Wood type : </label>
                  <input type="text" className="form-control" id="type" autoComplete="off"/>
                </div>
                <div className="form-group" className="col-sm-5" style={{float:"left"}}><br/>
                  <label htmlFor="type">Batch price : </label>
                  <input type="number" step="0.01" className="form-control" id="price" autoComplete="off"/>
                </div> 
                <div className="form-group" className="col-sm-5" style={{float:"right"}}><br/>
                  <label htmlFor="type">Batch quantity : </label>
                  <input type="number" className="form-control" id="quantity" autoComplete="off"/>
                </div> 
                <div className="form-group" className="col-sm-5" style={{float:"left"}}><br/>
                 <br/> <button type="submit" className="btn btn-primary" style={{float:"right"}}> Add batch</button> 
                </div>
              </form>
            </div>
          </div> <br/> <br/> <hr/>
          </> ) : null } 

        { isHandler == true && accounts[0].toLowerCase() !== admin.toLowerCase() ? (
          <> 
            <div className="row">
              <div className="col-sm-12">
                <h2>My Batches</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Id</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th>Origin</th>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Verify quantity</th>
                      <th>Change handler</th>
                      <th>Shift batch</th>
                      <th>Get history</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBatches.map(batch => (
                      <tr key={batch.id}>
                        <td>{batch.id}</td>
                        <td>{batch.currlat}</td>
                        <td>{batch.currlon}</td>
                        <td>{batch.originRegion}</td>
                        <td>{batch.woodType}</td>
                        <td>{batch.batchPrice}</td>
                        <td>{batch.quantity}</td>
                        <td> <button className="btn btn-primary" disabled={batch.transferAccepted} onClick={ () => verifyQuantity(batch.id)}>verify</button> </td>
                        <td> <button className="btn btn-primary" disabled={!batch.transferAccepted} onClick={ () => openTransferModal(batch.id)}>change</button> </td>
                        <td> <button className="btn btn-primary" disabled={!batch.transferAccepted} onClick={ () => openShiftModal(batch.id)}>shift</button> </td>
                        <td> <button className="btn btn-primary" onClick={ () => openHistoryModal(batch.id)}>track</button> </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div> <hr/>
          </> ) : null}

    <div>
      <Modal
        isOpen={transferModalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeTransferModal}
        style={customStylesSmall}
      >
        <h2 ref={(_subtitle) => (subtitle = _subtitle)}> Transfer ownership</h2>
        <span> <button onClick={closeTransferModal} style={{float:"right"}} > x </button> </span>
        <div> New Handler address : </div> <br/>
         <div> <form onSubmit={(e) => onTransferHandler(e)}>
          <input type="text" className="form-control" id="newHandler" /> <br/>
          <div><button className="btn btn-primary" type="submit" style={{float:"right"}} > Transfer </button></div>
        </form> </div>
      </Modal>
    </div>  

    <div>
      <Modal
        isOpen={shiftModalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeShiftModal}
        style={customStyles}
      >
        <h2 ref={(_subtitle) => (subtitle = _subtitle)}> Shift batch</h2>
        <span> <button onClick={closeShiftModal} style={{float:"right"}} > x </button> </span>
        <div> New location details : </div> <br/>
         <div> <form onSubmit={(e) => onShiftBatch(e)}>
          <label htmlFor="newlat">New Latitude : </label>
          <input type="number" step="0.000001" className="form-control" id="newlat" /> <br/>
          <label htmlFor="newlon">New Longitude : </label>
          <input type="number" step="0.000001" className="form-control" id="newlon" /> <br/>
          <label htmlFor="handlerAddress">New Handler address</label>
          <input type="text" className="form-control" id="newHandler" /> <br/>
          <div><button className="btn btn-primary" type="submit" style={{float:"right"}}> Shift </button></div>
        </form> </div>
      </Modal>
    </div>    

    <div>
      <Modal
        isOpen={historyModalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeHistoryModal}
        style={customStyles}
      >
        <h2 ref={(_subtitle) => (subtitle = _subtitle)}>Batch History</h2> 
        <button onClick={closeHistoryModal} style={{float:"right"}} > x </button> 
          <span><div style={{fontWeight:"bold"}}> Location history : </div></span> <br/>
          <div> 
            <p> {locations.map(loc => (
                        <>
                          <span key={loc.lat}>
                            [Latitude : {loc.lat}, Longitude : {loc.lon}, Handler : {loc.addr}] 
                          </span> <br/> 
                        </>
                      ))}
            </p>
          </div> <br/><br/>
          {/* <span><div style={{fontWeight:"bold"}}> Handler history : </div> </span>
          <div> 
            <p> {handlers.map(handler => (
                        <>
                          <span key={handler.id}>
                            {handler.addr}
                          </span> <br/> 
                        </>
                      ))}
            </p>
          </div> */}
      </Modal>
    </div>                


   
    </div>
  );
}

export default App;
