let chai = require('chai');
let chaiHttp = require('chai-http');
let should = chai.should();
let baseUrl = require('../../config/env').apiUrl;
let device = require('./sample-data').valid;
let userCredentials = require('./sample-data').user.admin;
let sensor = require('./sample-data').valid.sensors[0];
let utils = require('../utils');

chai.use(chaiHttp);
chai.Assertion.includeStack = true;

let createDevice = (s) => chai.request(baseUrl).post(`/devices`).send(s)
let deleteDevice = (id) => chai.request(baseUrl).delete(`/devices/${id}`)
let getSensors = () => chai.request(baseUrl).get(`/devices/${device.id}/sensors`)
let createSensor = (m) => chai.request(baseUrl).post(`/devices/${device.id}/sensors`).send(m)
let getSensor = (id) => chai.request(baseUrl).get(`/devices/${device.id}/sensors/${id}`)
let putSensorAttr = (id, attr, val) => chai.request(baseUrl).put(`/devices/${device.id}/sensors/${id}/${attr}`).set('content-type', 'text/plain;charset=utf-8').send(val)
let getSensorValues = (id) => chai.request(baseUrl).get(`/devices/${device.id}/sensors/${id}/values`)
let pushSensorValue = (id, val) => chai.request(baseUrl).post(`/devices/${device.id}/sensors/${id}/value`).set('content-type', 'application/json').send(val)

describe('Sensorurements', () => {
  let withAdmin = null
  let withNormal = null
  //Retrieve the tokens and create a new device
  before(async function () {
    try {
      withAdmin = await utils.getAdminAuth()
      withNormal = await utils.getNormalAuth()
      await deleteDevice(device.id).set(withAdmin)
      await createDevice(device).set(withAdmin)
    } catch (err) {
      console.log('error:' + err)
    }
  });

  //Clean after
  afterEach(async function () {
    try {
      await deleteDevice(device.id).set(withAdmin)
    } catch (err) {
      console.log('error:' + err)
    }
  });
  
  describe('Get Sensorurements', () => {
    it('sensors are returned in an array', async () => {
      await createDevice(device).set(withAdmin)
      let res = await getSensors().set(withAdmin)
      res.should.have.status(200);
      chai.expect(res.body.map(m => m.id)).to.have.members(device.sensors.map(m => m.id));
    });
    it('normal user CANNOT see private sensors', async () => {
      await createDevice({...device, visibility:'private'}).set(withAdmin)
      let res = await getSensors().set(withNormal)
      res.should.have.status(403);
    });
  });
  describe('Create sensor', () => {
    it('admin can create a sensor', async () => {
      await createDevice(device).set(withAdmin)
      let res = await createSensor(sensor).set(withAdmin)
      res.should.have.status(204);
    });
    it('normal user can create a sensor on his own device', async () => {
      await createDevice(device).set(withNormal)
      let res = await createSensor(sensor).set(withNormal)
      res.should.have.status(204);
    });
    it('normal user CANNOT create a sensor on a device owned by other', async () => {
      await createDevice(device).set(withAdmin)
      let res = await createSensor(sensor).set(withNormal)
      res.should.have.status(403);
    });
  });
  describe('Get a single Sensorurement', async () => {
    it('retrieved sensor values are correct', async () => {
      await createDevice(device).set(withAdmin)
      let res = await getSensor(sensor.id).set(withAdmin)
      res.should.have.status(200);
      //all fields of original device should be here
      res.body.should.deep.include(sensor);
    });
  });

  describe('Update Name of a Sensorurement', () => {
    it('name of sensor is updated', async () => {
      await createDevice(device).set(withAdmin)
      let res = await putSensorAttr(sensor.id, "name", "ss1").set(withAdmin)
      res.should.have.status(204);
      let res2 = await getSensor(sensor.id).set(withAdmin)
      res2.body.should.have.property('name').eql('ss1');
    });
    it('normal user CANNOT update attribute of device that he does not own', async () => {
      await createDevice(device).set(withAdmin)
      let res = await putSensorAttr(sensor.id, "name", "ss1").set(withNormal)
      res.should.have.status(403);
    });
  });
  describe('Update quantity kind of a Sensorurement', () => {
    it('quantity kind is updated', async () => {
      await createDevice(device).set(withAdmin)
      let res = await putSensorAttr(sensor.id, "quantity_kind", "Temperature").set(withAdmin)
      res.should.have.status(204);
      let res2 = await getSensor(sensor.id).set(withAdmin)
      res2.body.should.have.property('quantity_kind').eql('Temperature');
    });
  });

  describe('Update sensing device', () => {
    it('sensing device is updated', async () => {
      await createDevice(device).set(withAdmin)
      let res = await putSensorAttr(sensor.id, "device_kind", "Thermometer").set(withAdmin)
      res.should.have.status(204);
      let res2 = await getSensor(sensor.id).set(withAdmin)
      res2.body.should.have.property('device_kind').eql('Thermometer');
    });
  });
  describe('Update unit', () => {
    it('unit should be updated', async () => {
      await createDevice(device).set(withAdmin)
      let res = await putSensorAttr(sensor.id, "unit", "DegreeCelcius").set(withAdmin)
      res.should.have.status(204);
      let res2 = await getSensor(sensor.id).set(withAdmin)
      res2.body.should.have.property('unit').eql('DegreeCelcius');
    });
  });
  describe('get sensor values', () => {
    it('values are returned in an array', async () => {
      await createDevice(device).set(withAdmin)
      let res = await getSensorValues().set(withAdmin)
      res.should.have.status(200);
      res.body.should.be.a('array');
    });
    it('normal user CANNOT see values of a private device', async () => {
      await createDevice({...device, visibility: 'private'}).set(withAdmin)
      let res = await getSensorValues().set(withNormal)
      res.should.have.status(403);
    });
  });
  describe('push sensor value', () => {
    it('value is pushed', async () => {
      await createDevice(device).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": "25.6", "timestamp": "2016-06-08T18:20:27.873Z"}).set(withAdmin)
      res.should.have.status(200);
      let res2 = await getSensor(sensor.id).set(withAdmin)
      res2.body.last_value.should.deep.include({"value": "25.6", "timestamp": "2016-06-08T18:20:27.873Z"});
      res2.body.last_value.should.have.property('date_received');
      let res3 = await getSensorValues(sensor.id).set(withAdmin)
      chai.expect(res3.body[0]).to.deep.include({"value": "25.6", "timestamp": "2016-06-08T18:20:27.873Z"});
      res3.body[0].should.have.property('date_received');
    });
    it('normal user can push on public device', async () => {
      await createDevice(device).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": "25.6", "timestamp": "2016-06-08T18:20:27.873Z"}).set(withNormal)
      res.should.have.status(200);
    });
    it('normal user CANNOT push on private device', async () => {
      await createDevice({...device, visibility: 'private'}).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": "25.6", "timestamp": "2016-06-08T18:20:27.873Z"}).set(withNormal)
      res.should.have.status(403);
    });
    it('number value is pushed', async () => {
      await createDevice(device).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": 25.6}).set(withAdmin)
      let res2 = await getSensor(sensor.id).set(withAdmin)
      let res3 = await getSensorValues(sensor.id).set(withAdmin)
      res2.body.last_value.should.deep.include({"value": 25.6});
      res3.body[0].should.deep.include({"value": 25.6});
    });
    it('string value is pushed', async () => {
      await createDevice(device).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": "A"}).set(withAdmin)
      let res2 = await getSensor(sensor.id).set(withAdmin)
      let res3 = await getSensorValues(sensor.id).set(withAdmin)
      res2.body.last_value.should.deep.include({"value": "A"});
      res3.body[0].should.deep.include({"value": "A"});
    });
    it('boolean value is pushed', async () => {
      await createDevice(device).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": true}).set(withAdmin)
      let res2 = await getSensor(sensor.id).set(withAdmin)
      let res3 = await getSensorValues(sensor.id).set(withAdmin)
      res2.body.last_value.should.deep.include({"value": true});
      res3.body[0].should.deep.include({"value": true});
    });
    it('array value is pushed', async () => {
      await createDevice(device).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": [true]}).set(withAdmin)
      let res2 = await getSensor(sensor.id).set(withAdmin)
      let res3 = await getSensorValues(sensor.id).set(withAdmin)
      res2.body.last_value.should.deep.include({"value": [true]});
      res3.body[0].should.deep.include({"value": [true]});
    });
    it('object value is pushed', async () => {
      await createDevice(device).set(withAdmin)
      let res = await pushSensorValue(sensor.id, {"value": {a:1, b:"2"}}).set(withAdmin)
      let res2 = await getSensor(sensor.id).set(withAdmin)
      let res3 = await getSensorValues(sensor.id).set(withAdmin)
      res2.body.last_value.should.deep.include({"value": {a:1, b:"2"}});
      res3.body[0].should.deep.include({"value": {a:1, b:"2"}});
    });
  });
})