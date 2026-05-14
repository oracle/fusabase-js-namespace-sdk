// Copyright (c) 2015, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

import { Auth } from "./types/auth.js";
import { User, UserCredential } from "./types/user.js";
import { AuthProvider } from "./internal/auth_provider.js";
import { IdTokenResult } from "./types/idtoken.js";
import { AuthError } from "./errors.js";
import { persistenceType } from "./internal/storage/storage_types.js";
import { IDCSAuthProvider } from "./providers/idcs.js";
import { EmailAuthProvider } from "./providers/email.js";
import { GoogleAuthProvider } from "./providers/google.js";
import { FacebookAuthProvider } from "./providers/facebook.js";
import { GithubAuthProvider } from "./providers/github.js";
import { AuthCredential } from "./types/credential.js";
import { OAuthCredential } from "./types/credential.js";
import { OAuthProvider } from "./providers/oauth.js";
import { SAMLAuthCredential } from "./types/credential.js";
import { SAMLAuthProvider } from "./providers/saml.js";

var auth = {
  User: User,
  Auth: Auth,
  AuthProvider: AuthProvider,
  IDCSAuthProvider: IDCSAuthProvider,
  EmailAuthProvider: EmailAuthProvider,
  GoogleAuthProvider: GoogleAuthProvider,
  GithubAuthProvider: GithubAuthProvider,
  FacebookAuthProvider: FacebookAuthProvider,
  AuthCredential: AuthCredential,
  OAuthCredential: OAuthCredential,
  SAMLAuthCredential: SAMLAuthCredential,
  UserCredential: UserCredential,
  SAMLAuthProvider: SAMLAuthProvider,
  OAuthProvider: OAuthProvider,
  IdTokenResult: IdTokenResult,
  AuthError: AuthError,
  Persistence: persistenceType
};

export default auth;
