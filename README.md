<br />
<h1 align="center">Oracle Backend with Firebase APIs (Fusabase) JavaScript Namespace SDK</h1>

<p align="center">
  <a href="https://docs.oracle.com/en/database/oracle/backend-for-firebase/26.3/index.html">Guides</a>
  ·
  <a href="https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=4404&amp;clear=180,RR&amp;session=117297029571778">Free Workshop</a>
</p>

A JavaScript Namespace SDK for Oracle Backend with Firebase APIs (Fusabase) that provides authentication, document database, storage, App Trust, vector search, and UI component capabilities. It is exposed as a namespaced default export with subpath modules.

This Oracle Backend with Firebase APIs JavaScript Namespace SDK follows the Firebase design, API patterns, and rules-based authorization model. Its namespaced interface is designed to mirror the Firebase namespaced SDK interface so developers can move across backends with minimal changes. This JavaScript Namespace SDK is a distinct Oracle offering.

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
  backend_type: 'COLLECTION',       // RELATIONAL is not supported
  storage_bucket: 'your-bucket',
  auth_type: 'base',                // base | ldap | idcs | e-idcs (alias for idcs)
  auth_id: 'your-auth-id',

  // Optional transport and upload settings
  use_socket: true,                 // defaults to true
  long_polling_interval: 29,        // 5–300 seconds; used without sockets
  upload_chunk_size: 16 * 1024 * 1024,
  max_upload_bytes: 100 * 1024 * 1024
}, '[DEFAULT]');

// Set log level for all apps (use enum from subpath)
// fusabase.setLogLevel(appMod.LogLevel.ERROR);
// or
// fusabase.setLogLevel(oradbMod.LogLevel.ERROR);
```

Required initialization options are `ords_host`, `schema`, `app_id`,
`project_id`, `objs_type`, `backend_type`, `storage_bucket`, `auth_type`, and
`auth_id`.

| Parameter | Required | Description |
| --- | --- | --- |
| `ords_host` | Yes | Base ORDS URL used to construct Fusabase service endpoints. |
| `schema` | Yes | Oracle schema that owns the Fusabase resources. |
| `app_id` | Yes | Fusabase application identifier. |
| `project_id` | Yes | Fusabase project identifier used in service routes. |
| `objs_type` | Yes | Storage implementation. Use `dbfs` for DBFS; other values select OCI object storage. |
| `backend_type` | Yes | Backend data model. Specify `COLLECTION`; `RELATIONAL` is rejected because this SDK supports only the collection backend. |
| `storage_bucket` | Yes | Bucket used by Storage APIs. |
| `auth_type` | Yes | Authentication backend: `base`, `ldap`, `idcs`, or `e-idcs` (normalized to `idcs`). |
| `auth_id` | Yes | Authentication-service identifier. |
| `app_type` | No | Client platform used when composing App Trust headers; defaults to `web` where needed. |
| `use_socket` | No | Enables WebSocket realtime transport. Defaults to `true`; set `false` to use long polling. |
| `long_polling_interval` | No | Long-polling timeout in seconds. Integer from 5 through 300; defaults to 29. |
| `upload_chunk_size` | No | Storage upload chunk size in bytes. Defaults to 16 MiB. |
| `max_upload_bytes` | No | Maximum upload size in bytes. Must be a positive safe integer; defaults to 100 MiB. |
| `name` | No | Second `initializeApp` argument that registers the app name. Defaults to `[DEFAULT]`; each initialized app also becomes the default app. |

### Accessing Apps and Services

`initializeApp()` returns the initialized app and makes it the default app. Get
the default app with `fusabase.app()`, or a named app with
`fusabase.app('web-app')`; a lookup returns `undefined` if no app has that
name. The `fusabase.apps` array contains registered app entries. A named app is
also registered as the default app, so that same instance can appear twice.

```javascript
const app = fusabase.app();
const authService = fusabase.auth(app);
const db = fusabase.oracledb(app);
const storageService = fusabase.storage(app);

// Applies to apps that have already been initialized.
fusabase.setLogLevel('debug');
```

`fusabase.auth()`, `fusabase.oracledb()`, and `fusabase.storage()` use the
default app when their argument is omitted. They throw if no selected app has
been initialized.

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

`AuthUI` accepts either the initialized app or its Auth service. The UI supports
email/password, Google, Facebook, and GitHub controls. Add each control by
including its provider `PROVIDER_ID` in `signInOptions`. On successful sign-in,
`signInSuccessWithAuthResult` runs before navigation; return `false` from it to
prevent the configured `signInSuccessUrl` redirect. Calling `start()` without
options mounts the UI shell without provider controls.

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

## Trademarks

Firebase is a trademark of Google LLC.  Use of the Firebase name here is solely to describe the design patterns and SDK interfaces that Oracle Backend with Firebase APIs follows for developer familiarity and ease of migration; it does not imply any affiliation with or endorsement by Google.

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
