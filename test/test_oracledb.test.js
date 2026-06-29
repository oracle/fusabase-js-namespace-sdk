// test/fusabase.test.js
import assert from 'assert';
import LogLevel from '../logger.js';
import fusabase from '../fusabase.js';
import oracledb from '../oracledb/oracledb.js';

import { expect } from 'chai';

describe('OBAAS Integration Tests for version 1', function () {
  this.timeout(30000);

  const options = {}

  let app, db, cityRef, cityRef1, subColPlacesRef, fd1, docRef, docRef1, res9, subDocColPlacesRef;
  const collectionName = "Users";
  let testDocId;
  const testDocData = {
    "_id": 20042, "name": "Alice", "age": 30,
    "about": "Student"
  };

  const cityCol = "city";
  const cityCol1 = "pl";
  const docId = "city_001";
  const initialData = {
    name: "Metropolis",
    population: 500000,
    "mayor.name": "John Doe",
    stats: {
      founded: 1850,
      nicknames: ["Big City", "The Hub"],
      metrics: {
        area_km2: 450,
      }
    }
  };

  let testDocId1;
  const initialData1 = {
    "_id": 20041, "name": "Alice", "age": 30,
    "about": "Student"
  };
  

  it('should initialize the app', () => {
    app = fusabase.initializeApp({...options,appTrustToken:"APP_TRUST_TOKEN"}, 'test');
    expect(app.options.ordsHost, options.ords_host);
    expect(app.options.schema, options.schema);
    expect(app.options.appID, options.app_id);
    expect(app.options.objsType, options.objs_type);
    expect(app.options.storageBucket, options.storage_bucket);
    expect(app.options.authType, options.auth_type);
    expect(app.options.authID, options.auth_id);
  });

  it('should set log level', () => {
    fusabase.setLogLevel(LogLevel.ERROR);
  });

  it('should initialize oracledb', () => {
    db = fusabase.oracledb(app);
    expect(db.app.options.ordsHost, options.ords_host);
    expect(db.app.options.schema, options.schema);
    expect(db.app.options.appID, options.app_id);
    expect(db.app.options.objsType, options.objs_type);
    expect(db.app.options.storageBucket, options.storage_bucket);
    expect(db.app.options.authType, options.auth_type);
    expect(db.app.options.authID, options.auth_id);
    expect(db.app.config.objsType, options.objs_type);
    expect(db.app.config.storageBucket, options.storage_bucket);
    expect(db.app.config.authType, options.auth_type);
    expect(db.app.config.authID, options.auth_id);
  });

  it('should get city collection reference', () => {
    cityRef = db.collection('city');
    cityRef1 = db.collection('pl');
    assert.ok(cityRef);
    assert.ok(cityRef.oracledb);
    expect(cityRef.oracledb.app.name, 'test');
    expect(cityRef.id, 'city');
    expect(cityRef.path, 'city');
    assert.ok(!cityRef.parent);
  });

  it('should add and delete document', async () => {
    const resAddDoc = await db.collection('city').add({
      name: 'Udaipur',
      country: 'India',
      state: 'Rajasthan',
      capital: false,
      population: 200000,
      regions: ['Mevar'],
    });
    await resAddDoc.delete();
  });

  it('should set multiple docs in city', async () => {
    await cityRef.doc('SF').set({
      name: 'San Francisco',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 860000,
      regions: ['west_coast', 'norcal'],
    });
    await cityRef.doc('TEST_LA').set({
      name: 'San Francisco',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 10000,
      regions: ['west_coast', 'norcal'],
    });
    await cityRef.doc('TEST_LA1').set({
      name: 'San Francisco',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 10000,
      regions: ['west_coast', 'norcal'],
    });
    await cityRef.doc('TOK').set({
      name: 'Tokyo',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000,
      regions: ['kanto', 'honshu'],
    });
  });

  it('should update a doc', async () => {
    await cityRef.doc('UPDATE_TEST').set({
      name: 'UPDATE_TEST',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000,
      regions: ['kanto', 'honshu'],
    });
    await cityRef.doc('UPDATE_TEST').update({ population: 1000000 });
  });

  it('setdoc with merge', async () => {
    await cityRef1.doc('surat').set({
      name: 'UPDATE_TEST',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000
    });
    await cityRef1.doc('surat').set({population:1},{merge:true});
    let docSnap = await cityRef1.doc('surat').get();
    expect(docSnap).to.exist;
    expect(docSnap.data().population).to.equal(1);
  });

  it('should get on query level', async () => {
    const resdoc = await cityRef.get();
    assert.ok(resdoc);
  });

  it('should run a transaction', async () => {
    await cityRef.doc('TRANS_TEST2').set({
      name: 'Tokyo',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000,
      regions: ['kanto', 'honshu'],
    });
    const sfDocRef = db.collection('city').doc('TRANS_TEST2');
    const transRes1 = await db.runTransaction((transaction) =>
      transaction.get(sfDocRef).then((sfDoc) => {
        assert.ok(sfDoc.exists);
        transaction.update(sfDocRef, { population: 123453 });
        return 123453;
      })
    );
    expect(transRes1, 123453);
  });

  it('should execute WriteBatch', async () => {
    const batch = db.batch();
    const nycRef = db.collection('city').doc('BATCH_TEST');
    batch.set(nycRef, { name: 'New York City' });
    batch.update(nycRef, { population: 11000 });
    batch.delete(nycRef);
    await batch.commit();
  });

  it('collection group', async () => {
    const nycRef = db.collectionGroup('comments');
    const res = await nycRef.get();
    expect(res).to.exist;
    expect(res._docs).to.exist;
    expect(res.query).to.exist;
  });

  it('should get count', async () => {
    const ares1 = await cityRef.count().get();
    expect(ares1.data().count, 6);
    const ares2 = await cityRef.orderBy('population').count().get();
    expect(ares2.data().count, 6);
  });

  it('should run aggregate', async () => {
    const ares3 = await cityRef
      .aggregate({
        totalPopulation: oracledb.AggregateField.sum('population'),
      })
      .get();
    expect(ares3.data().totalPopulation).to.equal(11003453);
  });

  it('should aggregate total and final population ordered by population', async function () {
    const ares4 = await cityRef.orderBy("population").aggregate({
      totalPopulation: oracledb.AggregateField.sum('population'),
      finalPopulation: oracledb.AggregateField.sum('population')
    }).get();
    expect(ares4.data().totalPopulation).to.equal(11003453);
  });

  it('should get documents from city collection', async function () {
    const res1 = await db.collection("city").get();
    expect(res1).to.exist;
    expect(res1._docs).to.exist;
    expect(res1.query).to.exist;
    expect(res1._docs[0]._data).to.exist;
  });

  it('should get documents from city collection with where ==', async function () {
    const res2 = await db.collection("city").where("capital", "==", true).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs[0]._data).to.exist;
  });

  it('should get documents from city collection with where >=', async function () {
    const res2 = await db.collection("city").where("population", ">=", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where <=', async function () {
    const res2 = await db.collection("city").where("population", "<=", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where >', async function () {
    const res2 = await db.collection("city").where("population", ">", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where <', async function () {
    const res2 = await db.collection("city").where("population", "<", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where in', async function () {
    const res2 = await db.collection("city").where("country", "in", ["USA"]).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where in', async function () {
    const res2 = await db.collection("city").where("country", "not-in", ["USA"]).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where like', async function () {
    const res2 = await db.collection("city").where("country", "like", "USA").get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where like', async function () {
    const res2 = await db.collection("city").where("country", "!=", "USA").get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where array-contains', async function () {
    const res2 = await db.collection("city").where("regions", "array-contains", "west_coast").get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where array-contains-any', async function () {
    const res2 = await db.collection("city").where("regions", "array-contains-any", ["west_coast","honshu"]).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(6);
  });

  it('should get documents from city collection with orderBy', async function () {
    const res3 = await db.collection("city").orderBy("name", "desc").get();
    expect(res3).to.exist;
    expect(res3._docs).to.exist;
    expect(res3.query).to.exist;
    expect(res3._docs[0]._data).to.exist;
  });

  it('should get documents from city collection with limit', async function () {
    const res4 = await db.collection("city").limit(1).get();
    expect(res4).to.exist;
    expect(res4._docs).to.exist;
    expect(res4.query).to.exist;
    expect(res4._docs.length).to.equal(1);
    expect(res4._docs[0]._data).to.exist;
  });

  it('should delete document TEMP from city collection', async function () {
    await cityRef.doc("TEMP").set({
      name: "San Francisco", state: "CA", country: "USA",
      capital: false, population: 860000,
      regions: ["west_coast", "norcal"]
    });
    await db.collection("city").doc("TEMP").delete();
  });

  it('should create correct document reference for SF', function () {
    docRef = db.collection("city").doc("SF");
    expect(docRef).to.exist;
    expect(docRef.oracledb).to.exist;
    expect(docRef.oracledb.app.name).to.equal("test");
    expect(docRef.id).to.equal("SF");
    expect(docRef.path).to.equal("city/SF");
    expect(docRef.parent.id).to.equal("city");
  });

  it('should get document data from SF docRef', async function () {
    const res5 = await docRef.get();
    expect(res5._data).to.exist;
    expect(res5.ref).to.exist;
    expect(res5.ref.id).to.equal('SF');
  });

  it('should create correct subcollection reference for SF/places', function () {
    subColPlacesRef = db.collection("city").doc("SF").collection("places");
    expect(subColPlacesRef).to.exist;
    expect(subColPlacesRef.oracledb).to.exist;
    expect(subColPlacesRef.oracledb.app.name).to.equal("test");
    expect(subColPlacesRef.id).to.equal("places");
    expect(subColPlacesRef.path).to.equal("city/SF/places");
    expect(subColPlacesRef.parent.id).to.equal("SF");
  });

  it('should set documents in SF/places subcollection', async function () {
    await subColPlacesRef.doc("P1").set({
      name: "P11", state: "P12", country: "P13"
    });
    await subColPlacesRef.doc("P2").set({
      name: "P21", state: "P22", country: "P23"
    });
  });

  it('should create correct document reference for SF/places/P1', function () {
    subDocColPlacesRef = db.collection("city").doc("SF").collection("places").doc("P1");
    expect(subDocColPlacesRef).to.exist;
    expect(subDocColPlacesRef.oracledb).to.exist;
    expect(subDocColPlacesRef.oracledb.app.name).to.equal("test");
    expect(subDocColPlacesRef.id).to.equal("P1");
    expect(subDocColPlacesRef.path).to.equal("city/SF/places/P1");
    expect(subDocColPlacesRef.parent.id).to.equal("places");
  });

  it('should verify QuerySnapshot from city collection', async function () {
    const res7 = await db.collection("city").get();
    expect(res7.docs).to.exist;
    expect(res7.empty).to.be.false;
    expect(res7.query).to.exist;
    expect(res7.query.id).to.equal("city");
    expect(res7.metadata).to.exist;
    expect(res7.size).to.be.greaterThan(0);
  });

  it('should iterate through QuerySnapshot documents', async function () {
    const res7 = await db.collection("city").get();
    res7.forEach(res => {
      expect(res.exists).to.be.true;
      expect(res.id).to.exist;
      expect(res.metadata).to.exist;
      expect(res.ref).to.exist;
      expect(res).to.exist;
      expect(res.data).to.exist;
    });
  });

  it('should limit results with limitToLast', async function () {
    const res8 = await db.collection("city").orderBy("population").limitToLast(3).get();
    expect(res8._docs.length).to.equal(3);
  });

  it('should return correct result for startAt', async function () {
    const res9 = await db.collection("city").orderBy("population").startAt(860000).get();
    expect(res9._docs[0]._data.population).to.equal(860000);
  });

  it('should return correct result for startAfter', async function () {
    const res10 = await db.collection("city").orderBy("population").startAfter(860000).get();
    expect(res10._docs[0]._data.population).to.be.greaterThan(860000);
  });

  it('should return correct result for endAt', async function () {
    const res11 = await db.collection("city").orderBy("population").endAt(860000).get();
    expect(res11._docs[res11._docs.length - 1]._data.population).to.equal(860000);
  });

  it('should return correct result for endBefore', async function () {
    const res12 = await db.collection("city").orderBy("population").endBefore(860000).get();
    expect(res12._docs[res12._docs.length - 1]._data.population).to.be.lessThan(860000);
  });

  it('should work with startAt and FieldPath', async function () {
    const res13 = await db.collection("city").orderBy(new oracledb.FieldPath("population")).startAt(860000).get();
    expect(res13._docs[0]._data.population).to.equal(860000);
  });

  it('should work with where and FieldPath', async function () {
    const res14 = await db.collection("city").where(new oracledb.FieldPath("capital"), "==", true).get();
    expect(res14).to.exist;
    expect(res14._docs).to.exist;
    expect(res14.query).to.exist;
    expect(res14._docs[0]._data).to.exist;
  });

  it('should verify FieldPath properties', function () {
    fd1 = new oracledb.FieldPath("population");
    expect(fd1.fullPath).to.equal("population");

    expect(oracledb.FieldPath.documentId().fullPath).to.equal("OID");

    const fd2 = new oracledb.FieldPath("population", "place1");
    expect(fd2.fullPath).to.equal("population.place1");
  });

  it('should work with startAt using DocumentSnapshot', async function () {
    const res9 = await db.collection("city").orderBy("population").startAt(860000).get();
    const res15 = await db.collection("city").orderBy("population").startAt(res9._docs[0]).get();
    expect(res15._docs[0]._data.population).to.equal(860000);
  });

  it('should work with startAfter using DocumentSnapshot', async function () {
    const res16 = await db.collection("city").orderBy("population").startAfter(860000).get();
    expect(res16._docs[0]._data.population).to.be.greaterThan(860000);
  });

  it('should work with endAt using DocumentSnapshot', async function () {
    const res17 = await db.collection("city").orderBy("population").endAt(860000).get();
    expect(res17._docs[res17._docs.length - 1]._data.population).to.equal(860000);
  });

  it('should work with endBefore using DocumentSnapshot', async function () {
    const res18 = await db.collection("city").orderBy("population").endBefore(860000).get();
    expect(res18._docs[res18._docs.length - 1]._data.population).to.be.lessThan(860000);
  });

  it('should update document population', async function () {
    await docRef.update({ population: 800000 });
    const res19 = await docRef.get();
    expect(res19._data.population).to.equal(800000);
    expect(res19._data).to.exist;
    expect(res19.ref).to.exist;
    expect(res19.ref.id).to.equal('SF');
  });

  it('should update document population using FieldPath', async function () {
    fd1 = new oracledb.FieldPath("population");
    await docRef.update(fd1, 810000);
    const res20 = await docRef.get();
    expect(res20._data.population).to.equal(810000);
    expect(res20._data).to.exist;
    expect(res20.ref).to.exist;
    expect(res20.ref.id).to.equal('SF');
    expect(res20.get(fd1)).to.equal(810000);
  });

  //FieldPath -> need to fix
  it("should update a field with a dot in its name using FieldPath", async () => {
    await db.collection(cityCol).doc(docId).set(initialData);
    const mayorNamePath = new oracledb.FieldPath("mayor.name");

    await db.collection(cityCol).doc(docId).update({
      [mayorNamePath]: "Jane Smith"
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data()["mayor.name"]).to.equal("Jane Smith");
  });


  ////////new

  it("should set nested document", async () => {
    docRef1 = db.collection("pl").doc("alice");
    await docRef1.set({
      profile: {
        name: "Alice",
        stats: { age: 30, score: 10 },
        hobbies: ["reading", "chess"],
      },
      nestedJson: {
        level1: {
          level2: {
            deepKey: "original",
            anotherKey: 123,
          },
        },
      },
      lastLogin: oracledb.Timestamp.now(),
    });
  });

  it("should update nested field using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("profile", "stats", "score");
    await docRef1.update(fieldPath, 42);

    const doc = await docRef1.get();
    expect(doc.data().profile.stats.score).to.equal(42);
  });

  it("should increment numeric field with FieldValue.increment", async () => {
    await docRef1.update("profile.stats.age", oracledb.FieldValue.increment(5));

    const doc = await docRef1.get();
    expect(doc.data().profile.stats.age).to.equal(35);
  });

  it("should add new items to an array with FieldValue.arrayUnion", async () => {
    await docRef1.update("profile.hobbies", oracledb.FieldValue.arrayUnion("coding", "travel"));

    const doc = await docRef1.get();
    expect(doc.data().profile.hobbies).to.include.members(["reading", "chess", "coding", "travel"]);
  });

  it("should remove items from an array with FieldValue.arrayRemove", async () => {
    await docRef1.update("profile.hobbies", oracledb.FieldValue.arrayRemove("chess"));

    const doc = await docRef1.get();
    expect(doc.data().profile.hobbies).to.not.include("chess");
  });

  it("should delete a nested field with FieldValue.delete", async () => {
    await docRef1.update({
      "profile.stats.score": oracledb.FieldValue.delete(),
    });

    const doc = await docRef1.get();
    expect(doc.data().profile.stats).to.not.have.property("score");
  });

  it("should combine multiple operations in a single update", async () => {
    await docRef1.update({
      "profile.newField": "test",
      "profile.stats.age": oracledb.FieldValue.increment(-10),
      "profile.hobbies": oracledb.FieldValue.arrayUnion("gaming")
    });

    const doc = await docRef1.get();
    expect(doc.data().profile.stats.age).to.equal(25);
    expect(doc.data().profile.hobbies).to.include("gaming");
    expect(doc.data().profile.newField).to.equal("test");
  });

  // it("should update using a FieldPath with special characters", async () => {
  //   const weirdFieldRef = db.collection("pl").doc("settings");
  //   await weirdFieldRef.set({
  //     "key.with.dot": { enabled: true }
  //   });

  //   const path = new oracledb.FieldPath("key.with.dot", "enabled");
  //   await weirdFieldRef.update(path, false);

  //   const doc = await weirdFieldRef.get();
  //   expect(doc.data()["key.with.dot"].enabled).to.equal(false);
  // });

  //
  // EXTRA: Nested JSON FieldPath Tests
  //
  it("should update a deeply nested JSON key using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("nestedJson", "level1", "level2", "deepKey");
    await docRef1.update(fieldPath, "updatedValue");

    const doc = await docRef1.get();
    expect(doc.data().nestedJson.level1.level2.deepKey).to.equal("updatedValue");
  });

  it("should increment numeric value in deeply nested JSON using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("nestedJson", "level1", "level2", "anotherKey");
    await docRef1.update(fieldPath, oracledb.FieldValue.increment(10));

    const doc = await docRef1.get();
    expect(doc.data().nestedJson.level1.level2.anotherKey).to.equal(133);
  });

  it("should delete a deeply nested key using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("nestedJson", "level1", "level2", "deepKey");
    await docRef1.update(fieldPath, oracledb.FieldValue.delete());

    const doc = await docRef1.get();
    expect(doc.data().nestedJson.level1.level2).to.not.have.property("deepKey");
  });

  /////////end new

  it("should update a deeply nested field using FieldPath", async () => {
    await db.collection(cityCol).doc(docId).set(initialData);
    const areaPath = new oracledb.FieldPath("stats", "metrics", "area_km2");
    await db.collection(cityCol).doc(docId).update({
      [areaPath]: 500
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats.metrics.area_km2).to.equal(500);
  });

  it("should delete a deeply nested field using FieldPath + FieldValue.delete", async () => {
    const foundedPath = new oracledb.FieldPath("stats", "founded");
    await db.collection(cityCol).doc(docId).update({
      [foundedPath]: oracledb.FieldValue.delete()
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats).to.not.have.property("founded");
  });

  //FieldValue
  it("should increment population using FieldValue.increment", async () => {
    await db.collection(cityCol).doc(docId).update({
      population: oracledb.FieldValue.increment(50000)
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().population).to.equal(550000);
  });

  it("should add new nickname using FieldValue.arrayUnion", async () => {
    const nicknamesPath = new oracledb.FieldPath("stats", "nicknames");
    await db.collection(cityCol).doc(docId).update({
      [nicknamesPath]: oracledb.FieldValue.arrayUnion("City of Lights")
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats.nicknames).to.include("City of Lights");
  });

  it("should remove a nickname using FieldValue.arrayRemove", async () => {
    const nicknamesPath = new oracledb.FieldPath("stats", "nicknames");
    await db.collection(cityCol).doc(docId).update({
      [nicknamesPath]: oracledb.FieldValue.arrayRemove("Big City")
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats.nicknames).to.not.include("Big City");
  });

  //joins
  it("joins: should fetch", async () => {
    const resJoins = await db.join("TEST_1").get();
    expect(resJoins.empty).to.be.false;
  });

  //relational
  it("relational: should create a document", async () => {
    let res = await db.collection(collectionName).add(testDocData);
    testDocId = res.id;
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.exists).to.be.true;
    expect(doc.data()).to.deep.equal(testDocData);
  });

  it("relational: should read a document", async () => {
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.exists).to.be.true;
    expect(doc.data()).to.have.property("name", "Alice");
  });

  it("relational: should update a document", async () => {
    await db.collection(collectionName).doc(testDocId).update({ age: 31 });
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.data().age).to.equal(31);
  });

  it("relational: should increment age using FieldValue.increment", async () => {
    await db.collection(collectionName).doc(testDocId).update({
      age: oracledb.FieldValue.increment(1),
    });
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.data().age).to.equal(32);
  });

  it("relational: should store a custom Timestamp and retrieve it correctly", async () => {
    const customTimestamp = oracledb.Timestamp.fromDate(new Date("2025-01-01T00:00:00Z"));
    await db.collection(collectionName).doc(testDocId).update({
      about: customTimestamp,
    });

    const doc = await db.collection(collectionName).doc(testDocId).get();
    const ts = doc.data().about;
    expect(ts).to.be.instanceof(oracledb.Timestamp);
    expect(ts.toDate().toISOString()).to.equal("2025-01-01T00:00:00.000Z");
  });

  it("relational: should safely update age using a transaction", async () => {
    await db.runTransaction(async (transaction) => {
      const ref = db.collection(collectionName).doc(testDocId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw "Document does not exist";
      const newAge = 35;
      transaction.update(ref, { age: newAge });
    });

    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.data().age).to.equal(35);
  });

  it('relational: setdoc with merge', async () => {
    let setMergeRes = await db.collection(collectionName).add(initialData1);
    testDocId1 = setMergeRes.id;
    await setMergeRes.set({age:1},{merge:true});
    let docSnap = await setMergeRes.get();
    expect(docSnap).to.exist;
    expect(docSnap.data().age).to.equal(1);
  });

  it("relational: should update about and reset age in a batch", async () => {
    const batch = db.batch();

    const userRef = db.collection(collectionName).doc(testDocId);
    batch.update(userRef, { about: "Graduated", age: 30 });

    await batch.commit();

    const userDoc = await db.collection(collectionName).doc(testDocId).get();
    expect(userDoc.data().about).to.equal("Graduated");
    expect(userDoc.data().age).to.equal(30);
  });

  it("relational: should delete a document", async () => {
    await db.collection(collectionName).doc(testDocId).delete();
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.exists).to.be.false;
  });

  //duality view
  let testColRef;
  let testDocRef = null;
  let testDocRefId = null;
  let data = {
    "_id": 25,
    "departmentName": "DBAl",
    "location": "ww",
    "employees": [{ "employeeNumber": 12, "employeeName": "P32RATIK", "job": "CLERK", "salary": 12 }]
  }

  it("duality view: should create a document", async () => {
    // insert test data
    testColRef = db.dualityViewCollection("department_dv");
    let res = await testColRef.add(data);
    testDocRefId = res.id;
    testDocRef = db.dualityViewDoc("department_dv/" + testDocRefId);
  });

  it("duality view: should read collection docs", async () => {
    await testColRef.get();
  });

  it("duality view: should read a document", async () => {
    // read a document
    const docSnap = await db.dualityViewCollection("department_dv").doc(testDocRefId).get();
    expect(docSnap.exists).to.be.true;
    expect(docSnap.data().employees[0].employeeName).to.equal(data.employees[0].employeeName);
    expect(docSnap.data().employees[0].employeeNumber).to.equal(data.employees[0].employeeNumber);
    expect(docSnap.data().employees[0].job).to.equal(data.employees[0].job);
    expect(docSnap.data().employees[0].salary).to.equal(data.employees[0].salary);
  });

  it("duality view: should update a document", async () => {
    // update a document
    await db.dualityViewCollection("department_dv").doc(testDocRefId).update({ "departmentName": "Chirag" });
    const doc = await testDocRef.get();
    expect(doc.data().departmentName).to.equal("Chirag");
  });

  it("duality view: should delete a document", async () => {
    // update a document
    await db.dualityViewCollection("department_dv").doc(testDocRefId).delete();
    const doc = await testDocRef.get();
    expect(doc.exists).to.be.false;
  });

  after(async () => {
    await cityRef.doc('SF').delete();
    await cityRef.doc('TEST_LA').delete();
    await cityRef.doc('TOK').delete();
    await cityRef.doc('TEST_LA1').delete();
    await cityRef.doc('TRANS_TEST2').delete();
    await cityRef1.doc('surat').delete();
    await db.collection(collectionName).doc(testDocId1).delete();
    await db.collection(cityCol).doc(docId).delete();
    if (subColPlacesRef) {
      await subColPlacesRef.doc('P1').delete();
      await subColPlacesRef.doc('P2').delete();
    }
    await cityRef.doc('UPDATE_TEST').delete();
  });
});

describe('OBAAS Integration Tests for version 2', function () {
  this.timeout(30000);

  const options = {}

  let app, db, cityRef, cityRef1, subColPlacesRef, fd1, docRef, docRef1, res9, subDocColPlacesRef;
  const collectionName = "Users";
  let testDocId;
  const testDocData = {
    "_id": 20042, "name": "Alice", "age": 30,
    "about": "Student"
  };

  const cityCol = "city";
  const cityCol1 = "pl";
  const docId = "city_001";
  const initialData = {
    name: "Metropolis",
    population: 500000,
    "mayor.name": "John Doe",
    stats: {
      founded: 1850,
      nicknames: ["Big City", "The Hub"],
      metrics: {
        area_km2: 450,
      }
    }
  };

  let testDocId1;
  const initialData1 = {
    "_id": 20041, "name": "Alice", "age": 30,
    "about": "Student"
  };

  it('should initialize the app', () => {
    app = fusabase.initializeApp({...options,appTrustToken:"APP_TRUST_TOKEN"}, 'test');
    expect(app.options.ordsHost, options.ords_host);
    expect(app.options.schema, options.schema);
    expect(app.options.appID, options.app_id);
    expect(app.options.objsType, options.objs_type);
    expect(app.options.storageBucket, options.storage_bucket);
    expect(app.options.authType, options.auth_type);
    expect(app.options.authID, options.auth_id);
  });

  it('should set log level', () => {
    fusabase.setLogLevel(LogLevel.ERROR);
  });

  it('should initialize oracledb', () => {
    db = fusabase.oracledb(app);
    expect(db.app.options.ordsHost, options.ords_host);
    expect(db.app.options.schema, options.schema);
    expect(db.app.options.appID, options.app_id);
    expect(db.app.options.objsType, options.objs_type);
    expect(db.app.options.storageBucket, options.storage_bucket);
    expect(db.app.options.authType, options.auth_type);
    expect(db.app.options.authID, options.auth_id);
    expect(db.app.config.objsType, options.objs_type);
    expect(db.app.config.storageBucket, options.storage_bucket);
    expect(db.app.config.authType, options.auth_type);
    expect(db.app.config.authID, options.auth_id);
  });

  it('should get city collection reference', () => {
    cityRef = db.collection('city');
    cityRef1 = db.collection('pl');
    assert.ok(cityRef);
    assert.ok(cityRef.oracledb);
    expect(cityRef.oracledb.app.name, 'test');
    expect(cityRef.id, 'city');
    expect(cityRef.path, 'city');
    assert.ok(!cityRef.parent);
  });

  it('should add and delete document', async () => {
    const resAddDoc = await db.collection('city').add({
      name: 'Udaipur',
      country: 'India',
      state: 'Rajasthan',
      capital: false,
      population: 200000,
      regions: ['Mevar'],
    });
    await resAddDoc.delete();
  });

  it('should set multiple docs in city', async () => {
    await cityRef.doc('SF').set({
      name: 'San Francisco',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 860000,
      regions: ['west_coast', 'norcal'],
    });
    await cityRef.doc('TEST_LA').set({
      name: 'San Francisco',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 10000,
      regions: ['west_coast', 'norcal'],
    });
    await cityRef.doc('TEST_LA1').set({
      name: 'San Francisco',
      state: 'CA',
      country: 'USA',
      capital: false,
      population: 10000,
      regions: ['west_coast', 'norcal'],
    });
    await cityRef.doc('TOK').set({
      name: 'Tokyo',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000,
      regions: ['kanto', 'honshu'],
    });
  });

  it('setdoc with merge', async () => {
    await cityRef1.doc('surat').set({
      name: 'UPDATE_TEST',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000
    });
    await cityRef1.doc('surat').set({population:1},{merge:true});
    let docSnap = await cityRef1.doc('surat').get();
    expect(docSnap).to.exist;
    expect(docSnap.data().population).to.equal(1);
  });

  it('should update a doc', async () => {
    await cityRef.doc('UPDATE_TEST').set({
      name: 'UPDATE_TEST',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000,
      regions: ['kanto', 'honshu'],
    });
    await cityRef.doc('UPDATE_TEST').update({ population: 1000000 });
  });

  it('should get on query level', async () => {
    const resdoc = await cityRef.get();
    assert.ok(resdoc);
  });

  it('should run a transaction', async () => {
    await cityRef.doc('TRANS_TEST2').set({
      name: 'Tokyo',
      state: null,
      country: 'Japan',
      capital: true,
      population: 9000000,
      regions: ['kanto', 'honshu'],
    });
    const sfDocRef = db.collection('city').doc('TRANS_TEST2');
    const transRes1 = await db.runTransaction((transaction) =>
      transaction.get(sfDocRef).then((sfDoc) => {
        assert.ok(sfDoc.exists);
        transaction.update(sfDocRef, { population: 123453 });
        return 123453;
      })
    );
    expect(transRes1, 123453);
  });

  it('should execute WriteBatch', async () => {
    const batch = db.batch();
    const nycRef = db.collection('city').doc('BATCH_TEST');
    batch.set(nycRef, { name: 'New York City' });
    batch.update(nycRef, { population: 11000 });
    batch.delete(nycRef);
    await batch.commit();
  });

  it('collection group', async () => {
    const nycRef = db.collectionGroup('comments');
    const res = await nycRef.get();
    expect(res).to.exist;
    expect(res._docs).to.exist;
    expect(res.query).to.exist;
  });


  it('should get count', async () => {
    const ares1 = await cityRef.count().get();
    expect(ares1.data().count, 6);
    const ares2 = await cityRef.orderBy('population').count().get();
    expect(ares2.data().count, 6);
  });

  it('should run aggregate', async () => {
    const ares3 = await cityRef
      .aggregate({
        totalPopulation: oracledb.AggregateField.sum('population'),
      })
      .get();
    expect(ares3.data().totalPopulation).to.equal(11003453);
  });

  it('should aggregate total and final population ordered by population', async function () {
    const ares4 = await cityRef.orderBy("population").aggregate({
      totalPopulation: oracledb.AggregateField.sum('population'),
      finalPopulation: oracledb.AggregateField.sum('population')
    }).get();
    expect(ares4.data().totalPopulation).to.equal(11003453);
  });

  it('should get documents from city collection', async function () {
    const res1 = await db.collection("city").get();
    expect(res1).to.exist;
    expect(res1._docs).to.exist;
    expect(res1.query).to.exist;
    expect(res1._docs[0]._data).to.exist;
  });

  it('should get documents from city collection with where ==', async function () {
    const res2 = await db.collection("city").where("capital", "==", true).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs[0]._data).to.exist;
  });

  it('should get documents from city collection with where >=', async function () {
    const res2 = await db.collection("city").where("population", ">=", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where <=', async function () {
    const res2 = await db.collection("city").where("population", "<=", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where >', async function () {
    const res2 = await db.collection("city").where("population", ">", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where <', async function () {
    const res2 = await db.collection("city").where("population", "<", 200000).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where in', async function () {
    const res2 = await db.collection("city").where("country", "in", ["USA"]).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where in', async function () {
    const res2 = await db.collection("city").where("country", "not-in", ["USA"]).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where like', async function () {
    const res2 = await db.collection("city").where("country", "like", "USA").get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where like', async function () {
    const res2 = await db.collection("city").where("country", "!=", "USA").get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where array-contains', async function () {
    const res2 = await db.collection("city").where("regions", "array-contains", "west_coast").get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(3);
  });

  it('should get documents from city collection with where array-contains-any', async function () {
    const res2 = await db.collection("city").where("regions", "array-contains-any", ["west_coast","honshu"]).get();
    expect(res2).to.exist;
    expect(res2._docs).to.exist;
    expect(res2.query).to.exist;
    expect(res2._docs.length).to.equal(6);
  });

  it('should get documents from city collection with orderBy', async function () {
    const res3 = await db.collection("city").orderBy("name", "desc").get();
    expect(res3).to.exist;
    expect(res3._docs).to.exist;
    expect(res3.query).to.exist;
    expect(res3._docs[0]._data).to.exist;
  });

  it('should get documents from city collection with limit', async function () {
    const res4 = await db.collection("city").limit(1).get();
    expect(res4).to.exist;
    expect(res4._docs).to.exist;
    expect(res4.query).to.exist;
    expect(res4._docs.length).to.equal(1);
    expect(res4._docs[0]._data).to.exist;
  });

  it('should delete document TEMP from city collection', async function () {
    await cityRef.doc("TEMP").set({
      name: "San Francisco", state: "CA", country: "USA",
      capital: false, population: 860000,
      regions: ["west_coast", "norcal"]
    });
    await db.collection("city").doc("TEMP").delete();
  });

  it('should create correct document reference for SF', function () {
    docRef = db.collection("city").doc("SF");
    expect(docRef).to.exist;
    expect(docRef.oracledb).to.exist;
    expect(docRef.oracledb.app.name).to.equal("test");
    expect(docRef.id).to.equal("SF");
    expect(docRef.path).to.equal("city/SF");
    expect(docRef.parent.id).to.equal("city");
  });

  it('should get document data from SF docRef', async function () {
    const res5 = await docRef.get();
    expect(res5._data).to.exist;
    expect(res5.ref).to.exist;
    expect(res5.ref.id).to.equal('SF');
  });

  it('should create correct subcollection reference for SF/places', function () {
    subColPlacesRef = db.collection("city").doc("SF").collection("places");
    expect(subColPlacesRef).to.exist;
    expect(subColPlacesRef.oracledb).to.exist;
    expect(subColPlacesRef.oracledb.app.name).to.equal("test");
    expect(subColPlacesRef.id).to.equal("places");
    expect(subColPlacesRef.path).to.equal("city/SF/places");
    expect(subColPlacesRef.parent.id).to.equal("SF");
  });

  it('should set documents in SF/places subcollection', async function () {
    await subColPlacesRef.doc("P1").set({
      name: "P11", state: "P12", country: "P13"
    });
    await subColPlacesRef.doc("P2").set({
      name: "P21", state: "P22", country: "P23"
    });
  });

  it('should create correct document reference for SF/places/P1', function () {
    subDocColPlacesRef = db.collection("city").doc("SF").collection("places").doc("P1");
    expect(subDocColPlacesRef).to.exist;
    expect(subDocColPlacesRef.oracledb).to.exist;
    expect(subDocColPlacesRef.oracledb.app.name).to.equal("test");
    expect(subDocColPlacesRef.id).to.equal("P1");
    expect(subDocColPlacesRef.path).to.equal("city/SF/places/P1");
    expect(subDocColPlacesRef.parent.id).to.equal("places");
  });

  it('should verify QuerySnapshot from city collection', async function () {
    const res7 = await db.collection("city").get();
    expect(res7.docs).to.exist;
    expect(res7.empty).to.be.false;
    expect(res7.query).to.exist;
    expect(res7.query.id).to.equal("city");
    expect(res7.metadata).to.exist;
    expect(res7.size).to.be.greaterThan(0);
  });

  it('should iterate through QuerySnapshot documents', async function () {
    const res7 = await db.collection("city").get();
    res7.forEach(res => {
      expect(res.exists).to.be.true;
      expect(res.id).to.exist;
      expect(res.metadata).to.exist;
      expect(res.ref).to.exist;
      expect(res).to.exist;
      expect(res.data).to.exist;
    });
  });

  it('should limit results with limitToLast', async function () {
    const res8 = await db.collection("city").orderBy("population").limitToLast(3).get();
    expect(res8._docs.length).to.equal(3);
  });

  it('should return correct result for startAt', async function () {
    const res9 = await db.collection("city").orderBy("population").startAt(860000).get();
    expect(res9._docs[0]._data.population).to.equal(860000);
  });

  it('should return correct result for startAfter', async function () {
    const res10 = await db.collection("city").orderBy("population").startAfter(860000).get();
    expect(res10._docs[0]._data.population).to.be.greaterThan(860000);
  });

  it('should return correct result for endAt', async function () {
    const res11 = await db.collection("city").orderBy("population").endAt(860000).get();
    expect(res11._docs[res11._docs.length - 1]._data.population).to.equal(860000);
  });

  it('should return correct result for endBefore', async function () {
    const res12 = await db.collection("city").orderBy("population").endBefore(860000).get();
    expect(res12._docs[res12._docs.length - 1]._data.population).to.be.lessThan(860000);
  });

  it('should work with startAt and FieldPath', async function () {
    const res13 = await db.collection("city").orderBy(new oracledb.FieldPath("population")).startAt(860000).get();
    expect(res13._docs[0]._data.population).to.equal(860000);
  });

  it('should work with where and FieldPath', async function () {
    const res14 = await db.collection("city").where(new oracledb.FieldPath("capital"), "==", true).get();
    expect(res14).to.exist;
    expect(res14._docs).to.exist;
    expect(res14.query).to.exist;
    expect(res14._docs[0]._data).to.exist;
  });

  it('should verify FieldPath properties', function () {
    fd1 = new oracledb.FieldPath("population");
    expect(fd1.fullPath).to.equal("population");
    expect(oracledb.FieldPath.documentId().fullPath).to.equal("OID");
    const fd2 = new oracledb.FieldPath("population", "place1");
    expect(fd2.fullPath).to.equal("population.place1");
  });

  it('should work with startAt using DocumentSnapshot', async function () {
    const res9 = await db.collection("city").orderBy("population").startAt(860000).get();
    const res15 = await db.collection("city").orderBy("population").startAt(res9._docs[0]).get();
    expect(res15._docs[0]._data.population).to.equal(860000);
  });

  it('should work with startAfter using DocumentSnapshot', async function () {
    const res16 = await db.collection("city").orderBy("population").startAfter(860000).get();
    expect(res16._docs[0]._data.population).to.be.greaterThan(860000);
  });

  it('should work with endAt using DocumentSnapshot', async function () {
    const res17 = await db.collection("city").orderBy("population").endAt(860000).get();
    expect(res17._docs[res17._docs.length - 1]._data.population).to.equal(860000);
  });

  it('should work with endBefore using DocumentSnapshot', async function () {
    const res18 = await db.collection("city").orderBy("population").endBefore(860000).get();
    expect(res18._docs[res18._docs.length - 1]._data.population).to.be.lessThan(860000);
  });

  it('should update document population', async function () {
    await docRef.update({ population: 800000 });
    const res19 = await docRef.get();
    expect(res19._data.population).to.equal(800000);
    expect(res19._data).to.exist;
    expect(res19.ref).to.exist;
    expect(res19.ref.id).to.equal('SF');
  });

  it('should update document population using FieldPath', async function () {
    await docRef.update(fd1, 810000);
    const res20 = await docRef.get();
    expect(res20._data.population).to.equal(810000);
    expect(res20._data).to.exist;
    expect(res20.ref).to.exist;
    expect(res20.ref.id).to.equal('SF');
    expect(res20.get(fd1)).to.equal(810000);
  });

  //FieldPath
  it("should update a field with a dot in its name using FieldPath", async () => {
    await db.collection(cityCol).doc(docId).set(initialData);
    const mayorNamePath = new oracledb.FieldPath("mayor.name");

    await db.collection(cityCol).doc(docId).update({
      [mayorNamePath]: "Jane Smith"
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data()["mayor.name"]).to.equal("Jane Smith");
  });

  it("should set nested document", async () => {
    docRef1 = db.collection("pl").doc("alice");
    await docRef1.set({
      profile: {
        name: "Alice",
        stats: { age: 30, score: 10 },
        hobbies: ["reading", "chess"],
      },
      nestedJson: {
        level1: {
          level2: {
            deepKey: "original",
            anotherKey: 123,
          },
        },
      },
      lastLogin: oracledb.Timestamp.now(),
    });
  });

  it("should update nested field using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("profile", "stats", "score");
    await docRef1.update(fieldPath, 42);

    const doc = await docRef1.get();
    expect(doc.data().profile.stats.score).to.equal(42);
  });

  it("should increment numeric field with FieldValue.increment", async () => {
    await docRef1.update("profile.stats.age", oracledb.FieldValue.increment(5));

    const doc = await docRef1.get();
    expect(doc.data().profile.stats.age).to.equal(35);
  });

  it("should add new items to an array with FieldValue.arrayUnion", async () => {
    await docRef1.update("profile.hobbies", oracledb.FieldValue.arrayUnion("coding", "travel"));

    const doc = await docRef1.get();
    expect(doc.data().profile.hobbies).to.include.members(["reading", "chess", "coding", "travel"]);
  });

  it("should remove items from an array with FieldValue.arrayRemove", async () => {
    await docRef1.update("profile.hobbies", oracledb.FieldValue.arrayRemove("chess"));

    const doc = await docRef1.get();
    expect(doc.data().profile.hobbies).to.not.include("chess");
  });

  it("should delete a nested field with FieldValue.delete", async () => {
    await docRef1.update({
      "profile.stats.score": oracledb.FieldValue.delete(),
    });

    const doc = await docRef1.get();
    expect(doc.data().profile.stats).to.not.have.property("score");
  });

  it("should combine multiple operations in a single update", async () => {
    await docRef1.update({
      "profile.newField": "test",
      "profile.stats.age": oracledb.FieldValue.increment(-10),
      "profile.hobbies": oracledb.FieldValue.arrayUnion("gaming")
    });

    const doc = await docRef1.get();
    expect(doc.data().profile.stats.age).to.equal(25);
    expect(doc.data().profile.hobbies).to.include("gaming");
    expect(doc.data().profile.newField).to.equal("test");
  });

  // it("should update using a FieldPath with special characters", async () => {
  //   const weirdFieldRef = db.collection("pl").doc("settings");
  //   await weirdFieldRef.set({
  //     "key.with.dot": { enabled: true }
  //   });

  //   const path = new oracledb.FieldPath("key.with.dot", "enabled");
  //   await weirdFieldRef.update(path, false);

  //   const doc = await weirdFieldRef.get();
  //   expect(doc.data()["key.with.dot"].enabled).to.equal(false);
  // });

  //
  // EXTRA: Nested JSON FieldPath Tests
  //
  it("should update a deeply nested JSON key using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("nestedJson", "level1", "level2", "deepKey");
    await docRef1.update(fieldPath, "updatedValue");

    const doc = await docRef1.get();
    expect(doc.data().nestedJson.level1.level2.deepKey).to.equal("updatedValue");
  });

  it("should increment numeric value in deeply nested JSON using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("nestedJson", "level1", "level2", "anotherKey");
    await docRef1.update(fieldPath, oracledb.FieldValue.increment(10));

    const doc = await docRef1.get();
    expect(doc.data().nestedJson.level1.level2.anotherKey).to.equal(133);
  });

  it("should delete a deeply nested key using FieldPath", async () => {
    const fieldPath = new oracledb.FieldPath("nestedJson", "level1", "level2", "deepKey");
    await docRef1.update(fieldPath, oracledb.FieldValue.delete());

    const doc = await docRef1.get();
    expect(doc.data().nestedJson.level1.level2).to.not.have.property("deepKey");
  });

  it("should update a deeply nested field using FieldPath", async () => {
    await db.collection(cityCol).doc(docId).set(initialData);
    const areaPath = new oracledb.FieldPath("stats", "metrics", "area_km2");
    await db.collection(cityCol).doc(docId).update({
      [areaPath]: 500
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats.metrics.area_km2).to.equal(500);
  });

  it("should delete a deeply nested field using FieldPath + FieldValue.delete", async () => {
    const foundedPath = new oracledb.FieldPath("stats", "founded");
    await db.collection(cityCol).doc(docId).update({
      [foundedPath]: oracledb.FieldValue.delete()
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats).to.not.have.property("founded");
  });

  //FieldValue
  it("should increment population using FieldValue.increment", async () => {
    await db.collection(cityCol).doc(docId).update({
      population: oracledb.FieldValue.increment(50000)
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().population).to.equal(550000);
  });

  it("FieldValue.servertimestamp", async () => {
    await db.collection(cityCol).doc(docId).update({
      name: oracledb.FieldValue.serverTimestamp()
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().name).to.be.instanceof(oracledb.Timestamp);
  });

  it("should add new nickname using FieldValue.arrayUnion", async () => {
    const nicknamesPath = new oracledb.FieldPath("stats", "nicknames");
    await db.collection(cityCol).doc(docId).update({
      [nicknamesPath]: oracledb.FieldValue.arrayUnion("City of Lights")
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats.nicknames).to.include("City of Lights");
  });

  it("should remove a nickname using FieldValue.arrayRemove", async () => {
    const nicknamesPath = new oracledb.FieldPath("stats", "nicknames");
    await db.collection(cityCol).doc(docId).update({
      [nicknamesPath]: oracledb.FieldValue.arrayRemove("Big City")
    });

    const doc = await db.collection(cityCol).doc(docId).get();
    expect(doc.data().stats.nicknames).to.not.include("Big City");
  });

  //joins
  it("joins: should fetch", async () => {
    const resJoins = await db.join("TEST_1").get();
    expect(resJoins.empty).to.be.false;
  });

  //relational
  it("relational: should create a document", async () => {
    let res = await db.collection(collectionName).add(testDocData);
    testDocId = res.id;
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.exists).to.be.true;
    expect(doc.data()).to.deep.equal(testDocData);
  });

  it("relational: should read a document", async () => {
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.exists).to.be.true;
    expect(doc.data()).to.have.property("name", "Alice");
  });

  it("relational: should update a document", async () => {
    await db.collection(collectionName).doc(testDocId).update({ age: 31 });
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.data().age).to.equal(31);
  });

  it("relational: should increment age using FieldValue.increment", async () => {
    await db.collection(collectionName).doc(testDocId).update({
      age: oracledb.FieldValue.increment(1),
    });
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.data().age).to.equal(32);
  });

  //supposed to fail because clob in table and Timestamp attribute
  // it("relational: should set about using serverTimestamp", async () => {
  //   await db.collection(collectionName).doc(testDocId).update({
  //     about: oracledb.FieldValue.serverTimestamp(),
  //   });
  //   const doc = await db.collection(collectionName).doc(testDocId).get();
  //   expect(doc.data()).to.have.property("about");
  //   expect(doc.data().about).to.be.instanceof(oracledb.Timestamp);
  // });

  it("relational: should store a custom Timestamp and retrieve it correctly", async () => {
    const customTimestamp = oracledb.Timestamp.fromDate(new Date("2025-01-01T00:00:00Z"));
    await db.collection(collectionName).doc(testDocId).update({
      about: customTimestamp,
    });

    const doc = await db.collection(collectionName).doc(testDocId).get();
    const ts = doc.data().about;
    expect(ts).to.be.instanceof(oracledb.Timestamp);
    expect(ts.toDate().toISOString()).to.equal("2025-01-01T00:00:00.000Z");
  });

  it("relational: should safely update age using a transaction", async () => {
    await db.runTransaction(async (transaction) => {
      const ref = db.collection(collectionName).doc(testDocId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw "Document does not exist";
      const newAge = 35;
      transaction.update(ref, { age: newAge });
    });

    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.data().age).to.equal(35);
  });

  it("relational: should update about and reset age in a batch", async () => {
    const batch = db.batch();

    const userRef = db.collection(collectionName).doc(testDocId);
    batch.update(userRef, { about: "Graduated", age: 30 });

    await batch.commit();

    const userDoc = await db.collection(collectionName).doc(testDocId).get();
    expect(userDoc.data().about).to.equal("Graduated");
    expect(userDoc.data().age).to.equal(30);
  });

  it('relational: setdoc with merge', async () => {
    let setMergeRes = await db.collection(collectionName).add(initialData1);
    testDocId1 = setMergeRes.id;
    await setMergeRes.set({age:1},{merge:true});
    let docSnap = await setMergeRes.get();
    expect(docSnap).to.exist;
    expect(docSnap.data().age).to.equal(1);
  });

  it("relational: should delete a document", async () => {
    await db.collection(collectionName).doc(testDocId).delete();
    const doc = await db.collection(collectionName).doc(testDocId).get();
    expect(doc.exists).to.be.false;
  });
  

  //duality view
  let testColRef;
  let testDocRef = null;
  let testDocRefId = null;
  let data = {
    "_id": 25,
    "departmentName": "DBAl",
    "location": "ww",
    "employees": [{ "employeeNumber": 12, "employeeName": "P32RATIK", "job": "CLERK", "salary": 12 }]
  }

  it("duality view: should create a document", async () => {
    // insert test data
    testColRef = db.dualityViewCollection("department_dv");
    let res = await testColRef.add(data);
    testDocRefId = res.id;
    testDocRef = db.dualityViewDoc("department_dv/" + testDocRefId);
  });

  it("duality view: should read a document", async () => {
    // read a document
    const docSnap = await db.dualityViewCollection("department_dv").doc(testDocRefId).get();
    expect(docSnap.exists).to.be.true;
    expect(docSnap.data().employees[0].employeeName).to.equal(data.employees[0].employeeName);
    expect(docSnap.data().employees[0].employeeNumber).to.equal(data.employees[0].employeeNumber);
    expect(docSnap.data().employees[0].job).to.equal(data.employees[0].job);
    expect(docSnap.data().employees[0].salary).to.equal(data.employees[0].salary);
  });

  it("duality view: should update a document", async () => {
    // update a document
    await db.dualityViewCollection("department_dv").doc(testDocRefId).update({ "departmentName": "Chirag" });
    const doc = await testDocRef.get();
    expect(doc.data().departmentName).to.equal("Chirag");
  });

  it("duality view: should delete a document", async () => {
    await db.dualityViewCollection("department_dv").doc(testDocRefId).delete();
    const doc = await testDocRef.get();
    expect(doc.exists).to.be.false;
  });

  after(async () => {
    await cityRef.doc('SF').delete();
    await cityRef.doc('TEST_LA').delete();
    await cityRef.doc('TOK').delete();
    await cityRef.doc('TEST_LA1').delete();
    await db.collection(collectionName).doc(testDocId1).delete();
    await cityRef1.doc('surat').delete();
    await cityRef.doc('TRANS_TEST2').delete();
    await db.collection(cityCol).doc(docId).delete();
    if (subColPlacesRef) {
      await subColPlacesRef.doc('P1').delete();
      await subColPlacesRef.doc('P2').delete();
    }
    await cityRef.doc('UPDATE_TEST').delete();
  });
});



