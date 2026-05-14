# Oracle® Backend for Firebase (Fusabase) JavaScript Namespace SDK

A JavaScript SDK for Oracle Backend for Firebase (Fusabase) that provides authentication, document database, storage, App Trust, vector search, and UI component capabilities. Exposed as a namespaced default export with subpath modules.

## Prerequisites

- Node.js (version 18 or later)
- npm (comes with Node.js)

## Installation

Install the JavaScript Namespace SDK package:

```bash
npm install fusabase-ns
```

## Usage

The SDK exposes a namespaced default export `fusabase` and subpath modules for App, Auth, Database, Storage, App Trust, and UI.

### App Initialization

```javascript
import fusabase from 'fusabase-ns';

const appInstance = fusabase.initializeApp({
  // Required
  ords_host: 'https://your-ords-host/ords/your-schema/',
  schema: 'your-schema',
  app_id: 'your-app-id',
  project_id: 'your-project-id',
  objs_type: 'dbfs',                // your objects type (e.g. 'dbfs')
  storage_bucket: 'your-bucket',
  auth_type: 'base',                // base | ldap_s | base_s | idcs
  auth_id: 'your-auth-id'
}, '[DEFAULT]');

// Set log level for all apps (use enum from subpath)
// fusabase.setLogLevel(appMod.LogLevel.ERROR);
// or
// fusabase.setLogLevel(oradbMod.LogLevel.ERROR);
```

### Authentication

```javascript
import fusabase from 'fusabase-ns';
import auth from 'fusabase-ns/auth';

const appInstance = fusabase.app(); // or hold the instance returned from initializeApp
const authInstance = fusabase.auth(appInstance);

// Create a new user (IDCS/Base depending on your config)
const userCredential = await authInstance.createUserWithEmailAndPassword('user@example.com', 'password');

// Sign in an existing user
const signInCred = await authInstance.signInWithEmailAndPassword('user@example.com', 'password');

// Social login with popup (for on-prem supported providers)
const googleCred = await authInstance.signInWithPopup(new auth.GoogleAuthProvider());

// Social login with redirect (IDCS or on-prem)
await authInstance.signInWithRedirect(new auth.GoogleAuthProvider());
// Later in your redirect handler:
// const result = await authInstance.getRedirectResult(authInstance);

// Listen to auth state
const unsubscribe = authInstance.onAuthStateChanged(user => {
  console.log('Current user:', user);
});
// unsubscribe();
```

### Database (OracleDB)

```javascript
import fusabase from 'fusabase-ns';
import oracledb from 'fusabase-ns/oracledb';

const appInstance = fusabase.app();
const db = fusabase.oracledb(appInstance);

// Get a document
const docRef = db.collection('collection-name').doc('document-id');
const docSnap = await docRef.get();
if (docSnap.exists) {
  console.log(docSnap.data());
}

// Add a document
const newRef = await db.collection('collection-name').add({
  field1: 'value1',
  field2: 123
});

// Query
const querySnap = await db.collection('collection-name')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
querySnap.forEach(d => console.log(d.id, d.data()));

// Aggregation
const aggSnap = await db.collection('collection-name')
  .aggregate({
    total: oracledb.AggregateField.sum('amount')
  })
  .get();
console.log(aggSnap.data().total);

// Transactions
const ref = db.collection('collection-name').doc('doc-1');
await db.runTransaction(async (tx) => {
  const snap = await tx.get(ref);
  if (snap.exists) {
    tx.update(ref, { counter: oracledb.FieldValue.increment(1) });
  }
});
```

### Vector Search

The SDK supports similarity search over dense and sparse embeddings via `findNearest` on a collection or query.

```javascript
import fusabase from 'fusabase-ns';

const db = fusabase.oracledb(fusabase.app());

// Dense vector similarity search
const denseSnap = await db.collection('documents')
  .findNearest(
    'embedding',
    { vector: [0.22, 0.93, -0.10] },
    { metric: 'COSINE', topK: 10 }
  )
  .get();

// Sparse vector similarity search
const sparseSnap = await db.collection('documents')
  .findNearest(
    'embedding',
    { sparse: { type: 'sparse', dimension: 1000, indices: [2, 7, 900], values: [0.9, 0.3, 0.5] } },
    { metric: 'DOT', topK: 5 }
  )
  .get();
```

Supported metrics: `'COSINE'`, `'EUCLIDEAN'`, `'DOT'`.

### Storage

```javascript
import fusabase from 'fusabase-ns';

const appInstance = fusabase.app();
const storage = fusabase.storage(appInstance);

// Upload bytes
const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const storageRef = storage.ref('path/to/file.bin');
const snapshot = await storageRef.put(bytes);

// Download URL
const url = await storageRef.getDownloadURL();

// Metadata
const meta = await storageRef.getMetadata();

// List
const listRes = await storage.ref('path/to').list();
const listAllRes = await storage.ref('path/to').listAll();

// Delete
await storageRef.delete();
```

### App Trust (Browser)

Fusabase App Trust protects your backend endpoints by adding an attestation token to all `/_/baas-services/*` requests.

```javascript
import fusabase from 'fusabase-ns';
import {
  initializeAppTrust,
  TurnstileProvider,
  HCaptchaProvider,
  ReCaptchaV3Provider,
  ReCaptchaEnterpriseProvider,
} from 'fusabase-ns/app-trust';

const app = fusabase.app();

// Pick one provider:
const appTrust = initializeAppTrust(app, {
  provider: new TurnstileProvider('YOUR_TURNSTILE_SITE_KEY'),
});

// or:
// new HCaptchaProvider('YOUR_HCAPTCHA_SITE_KEY')
// new ReCaptchaV3Provider('YOUR_RECAPTCHA_V3_SITE_KEY')
// new ReCaptchaEnterpriseProvider('YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY')
```

> Note: the Fusabase attestation servlet must be configured with the matching provider id: `turnstile`, `hcaptcha`, `recaptchav3`, or `recaptchaenterprise`.

Pre-mint or refresh a token (optional):

```javascript
import { getToken } from 'fusabase-ns/app-trust';

const tok = await getToken(appTrust, true);
console.log('App Trust token expires at', new Date(tok.expireTimeMillis));
```

### UI Components (Optional)

```javascript
import { authUI } from 'fusabase-ns/ui';
import fusabase from 'fusabase-ns';
import auth from 'fusabase-ns/auth';

const appInstance = fusabase.app();
const authInstance = fusabase.auth(appInstance);

const ui = new authUI.AuthUI(authInstance);
ui.start('#auth-container', {
  signInOptions: [
    auth.EmailAuthProvider.PROVIDER_ID,
    auth.GoogleAuthProvider.PROVIDER_ID,
    auth.FacebookAuthProvider.PROVIDER_ID,
    auth.GithubAuthProvider.PROVIDER_ID
  ],
  signInSuccessUrl: '/home',
  callbacks: {
    // Return false to prevent automatic redirect
    signInSuccessWithAuthResult: (result, redirectUrl) => true
  }
});
```

## Documentation

Generate TypeDoc documentation:

```bash
npm run docs
```

Output is generated per the configured TypeDoc options (see `typedoc.json`).

## Building the Project

```bash
npm run build
```

## Creating a Distribution Tarball

```bash
npm pack
```

This produces a `.tgz` ready for publishing or local installation.

## Running Tests

```bash
npm test
```

Runs the Mocha test suite in the `test/` directory.

## Contributing

This project welcomes contributions from the community. Before submitting a pull request, please [review our contribution guide](./CONTRIBUTING.md).

## Security

Please consult the [security guide](./SECURITY.md) for our responsible security vulnerability disclosure process.

## License

Copyright (c) 2015, 2026, Oracle and/or its affiliates.

This software is dual-licensed to you under the Universal Permissive License
(UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
either license.

If you elect to accept the software under the Apache License, Version 2.0,
the following applies:

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
