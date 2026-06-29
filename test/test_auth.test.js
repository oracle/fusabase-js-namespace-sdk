import { expect } from "chai";
import fusabase from "../fusabase.js";
import LogLevel from "../logger.js";

function generateRandomEmail() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let username = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "randommail.com"];
  return `${username}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

describe("OBAAS Auth Tests", function () {
  this.timeout(30000);

  let app, auth_c;
  const options = {};

  const providerid_value = "password";
  const providerid_value1 = "UserNamePassword";

  const email = generateRandomEmail();
  const password = "Chirag@123";
  const newPassword = "Chirag@1234";
  const newName1 = "Test name 1";
  const phoneNumber1 = "1234567891";
  const newName2 = "Test name 2";
  const phoneNumber2 = "1234567892";

  before(() => {
    app = fusabase.initializeApp({...options,appTrustToken:"APP_TRUST_TOKEN"}, 'test');
    fusabase.setLogLevel(LogLevel.ERROR);
    auth_c = fusabase.auth(app);
  });

  describe("App Initialization", () => {
    it("should set app options correctly", () => {
      expect(app.options.ordsHost).to.equal(options.ords_host);
      expect(app.options.schema).to.equal(options.schema);
      expect(app.options.appID).to.equal(options.app_id);
      expect(app.options.objsType).to.equal(options.objs_type);
      expect(app.options.storageBucket).to.equal(options.storage_bucket);
      expect(app.options.authType).to.equal(options.auth_type);
      expect(app.options.authID).to.equal(options.auth_id);
    });
  });

  describe("User Lifecycle", () => {
    let createdUser;

    it("should create a user with email and password", async () => {
      const res1 = await auth_c.createUserWithEmailAndPassword(email, password);
      expect(res1.user).to.exist;
      expect(res1.credential).to.exist;
      expect(res1.user.displayName).to.equal("- -");
      expect(res1.user.email).to.equal(email);
      expect(res1.user.phoneNumber).to.be.null;
      expect(res1.user.photoURL).to.be.null;
      expect(res1.user.refreshToken).to.exist;
      expect(res1.user.providerId).to.equal(providerid_value1);
      expect(res1.credential.providerId).to.equal(providerid_value);
      expect(res1.credential.signInMethod).to.equal("password");
      createdUser = res1.user;
    });

    it("should sign in with email and password", async () => {
      const res2 = await auth_c.signInWithEmailAndPassword(email, password);
      expect(res2.user).to.exist;
      expect(res2.credential).to.exist;
      expect(res2.user.email).to.equal(email);
      expect(auth_c.currentUser.email).to.equal(email);
    });

    it("should update password", async () => {
      await createdUser.updatePassword(password, newPassword);
      const res3 = await auth_c.signInWithEmailAndPassword(email, newPassword);
      expect(res3.user).to.exist;
      expect(res3.user.email).to.equal(email);
    });

    it("should update displayName", async () => {
      await createdUser.updateProfile({ displayName: newName1 });
      const res4 = await auth_c.signInWithEmailAndPassword(email, newPassword);
      expect(res4.user.displayName).to.equal(newName1);
    });

    // it("should update phone number", async () => {
    //   await createdUser.updateProfile({ phoneNumber: phoneNumber1 });
    //   const res5 = await auth_c.signInWithEmailAndPassword(email, newPassword);
    //   console.log(res5.user);
    //   const t = await res5.user.getIdToken();
    //   console.log(t);
    //   expect(res5.user.phoneNumber).to.equal(phoneNumber1);
    // });

    // it("should update displayName and phoneNumber together", async () => {
    //   await createdUser.updateProfile({
    //     displayName: newName2,
    //     phoneNumber: phoneNumber2,
    //   });
    //   const res6 = await auth_c.signInWithEmailAndPassword(email, newPassword);
    //   expect(res6.user.displayName).to.equal(newName2);
    //   expect(res6.user.phoneNumber).to.equal(phoneNumber2);
    // });

    it("should sign out", async () => {
      await auth_c.signOut();
      expect(auth_c.currentUser).to.be.null;
    });
  });

  describe("Token and Reload Tests", () => {
    let signedInUser;

    before(async () => {
      const res = await auth_c.signInWithEmailAndPassword(email, newPassword);
      signedInUser = res.user;
    });

    it("should get IdToken", async () => {
      const token = await signedInUser.getIdToken();
      expect(token).to.be.a("string").and.not.empty;
    });

    it("should get IdTokenResult", async () => {
      const tokenRes = await signedInUser.getIdTokenResult();
      expect(tokenRes).to.have.property("issuedAtTime");
      expect(tokenRes).to.have.property("expirationTime");
      expect(tokenRes).to.have.property("authTime");
      expect(tokenRes).to.have.property("parsedJwt");
      expect(tokenRes.parsedJwt).to.have.property("user_id");
    });

    it("should reload user", async () => {
      await signedInUser.reload();
      expect(auth_c.currentUser.email).to.equal(signedInUser.email);
    });
  });
});

// describe("OBAAS Auth Tests IDCS", function () {
//   this.timeout(30000);

//   let app, auth_c;
//   const options = {};

//   const providerid_value = "password";
//   const providerid_value1 = "UserNamePassword";

//   const email = generateRandomEmail();
//   const password = "Chirag@123";
//   const newPassword = "Chirag@1234";
//   const newName1 = "Test name 1";
//   const phoneNumber1 = "1234567891";
//   const newName2 = "Test name 2";
//   const phoneNumber2 = "1234567892";

//   before(() => {
//     app = fusabase.initializeApp(options, "test");
//     fusabase.setLogLevel(LogLevel.ERROR);
//     auth_c = fusabase.auth(app);
//   });

//   describe("App Initialization", () => {
//     it("should set app options correctly", () => {
//       expect(app.options.ordsHost).to.equal(options.ords_host);
//       expect(app.options.schema).to.equal(options.schema);
//       expect(app.options.appID).to.equal(options.app_id);
//       expect(app.options.objsType).to.equal(options.objs_type);
//       expect(app.options.storageBucket).to.equal(options.storage_bucket);
//       expect(app.options.authType).to.equal(options.auth_type);
//       expect(app.options.authID).to.equal(options.auth_id);
//     });
//   });

//   describe("User Lifecycle", () => {
//     let createdUser;

//     it("should create a user with email and password", async () => {
//       const res1 = await auth_c.createUserWithEmailAndPassword(email, password);
//       expect(res1.user).to.exist;
//       expect(res1.credential).to.exist;
//       expect(res1.user.displayName).to.equal("- -");
//       expect(res1.user.email).to.equal(email);
//       expect(res1.user.phoneNumber).to.be.null;
//       expect(res1.user.photoURL).to.be.null;
//       expect(res1.user.refreshToken).to.exist;
//       expect(res1.user.providerId).to.equal(providerid_value1);
//       expect(res1.credential.providerId).to.equal(providerid_value);
//       expect(res1.credential.signInMethod).to.equal("password");
//       createdUser = res1.user;
//     });

//     it("should sign in with email and password", async () => {
//       const res2 = await auth_c.signInWithEmailAndPassword(email, password);
//       expect(res2.user).to.exist;
//       expect(res2.credential).to.exist;
//       expect(res2.user.email).to.equal(email);
//       expect(auth_c.currentUser.email).to.equal(email);
//     });

//     it("should update password", async () => {
//       await createdUser.updatePassword(password, newPassword);
//       const res3 = await auth_c.signInWithEmailAndPassword(email, newPassword);
//       expect(res3.user).to.exist;
//       expect(res3.user.email).to.equal(email);
//     });

//     it("should update displayName", async () => {
//       await createdUser.updateProfile({ displayName: newName1 });
//       const res4 = await auth_c.signInWithEmailAndPassword(email, newPassword);
//       expect(res4.user.displayName).to.equal(newName1);
//     });

//     it("should update phone number", async () => {
//       await createdUser.updateProfile({ phoneNumber: phoneNumber1 });
//       const res5 = await auth_c.signInWithEmailAndPassword(email, newPassword);
//       const t = await res5.user.getIdToken();
//       expect(res5.user.phoneNumber).to.equal(phoneNumber1);
//     });

//     it("should update photo url", async () => {
//       await createdUser.updateProfile({ photoURL: "https://aaa.com" });
//       const res5 = await auth_c.signInWithEmailAndPassword(email, newPassword);
//       const t = await res5.user.getIdToken();
//       expect(res5.user.photoURL).to.equal("https://aaa.com");
//     });

//     it("should update displayName and phoneNumber together", async () => {
//       await createdUser.updateProfile({
//         displayName: newName2,
//         phoneNumber: phoneNumber2,
//       });
//       const res6 = await auth_c.signInWithEmailAndPassword(email, newPassword);
//       expect(res6.user.displayName).to.equal(newName2);
//       expect(res6.user.phoneNumber).to.equal(phoneNumber2);
//     });

//     it("should sign out", async () => {
//       await auth_c.signOut();
//       expect(auth_c.currentUser).to.be.null;
//     });
//   });

//   describe("Token and Reload Tests", () => {
//     let signedInUser;

//     before(async () => {
//       const res = await auth_c.signInWithEmailAndPassword(email, newPassword);
//       signedInUser = res.user;
//     });

//     it("should get IdToken", async () => {
//       const token = await signedInUser.getIdToken();
//       expect(token).to.be.a("string").and.not.empty;
//     });

//     it("should get IdTokenResult", async () => {
//       const tokenRes = await signedInUser.getIdTokenResult();
//       expect(tokenRes).to.have.property("issuedAtTime");
//       expect(tokenRes).to.have.property("expirationTime");
//       expect(tokenRes).to.have.property("authTime");
//       expect(tokenRes).to.have.property("parsedJwt");
//       expect(tokenRes.parsedJwt).to.have.property("user_id");
//     });

//     it("should reload user", async () => {
//       await signedInUser.reload();
//       expect(auth_c.currentUser.email).to.equal(signedInUser.email);
//     });
//   });
// });
