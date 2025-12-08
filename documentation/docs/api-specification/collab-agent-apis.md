---
sidebar_position: 1
description: What should be in this section.
---

Collab Agent APIs
=============================
## Authentication API

### signIn Function
Defined in api/auth-api.ts:31

Signs in a user using their email and password credentials.

**Parameters:**
- `email: string` - The user's email address
- `password: string` - The user's password

**Returns:** `Promise<{ token?: string; error?: string }>`
- `token`: Authentication token for the user session (on success)
- `error`: Error message describing why sign-in failed

**Example:** 
```typescript
`const result = await signIn('user@example.com', 'password123');
if (result.error) {
  vscode.window.showErrorMessage(`Sign in failed: ${result.error}`);
} else {
  console.log(`Signed in successfully, token: ${result.token}`);
}
```

### signOut Function
Defined in api/auth-api.ts:69

Signs out a user by invalidating their session on the backend.

**Parameters:**
- `userID: string` - The user's unique ID.

**Returns:** `Promise<{ error?: string }>`
- An object indicating success or containing an error message.

***

## User API

### getUserByID Function
Defined in api/user-api.ts:10

Fetches detailed user information by their unique ID.

**Parameters:**
- `userID: string` - The user's unique identifier.

**Returns:** `Promise<{ user?: User; error?: string }>`
- An object containing the user data or an error message.

***

## Supabase Client API

### getSupabase Function

Defined in **auth/supabaseClient.ts:44**

Returns a **singleton Supabase client** configured for the VS Code environment, handling session persistence and token refresh using VS Code's global state.

**Returns:** `SupabaseClient`
* The configured **SupabaseClient** instance ready for database operations and authentication.

**Throws:**
* `Error` - If the Supabase URL or API key is not configured.

**Remarks:**
* **Singleton Pattern:** The client is created only once and reused across the extension.
* **Configuration:** Uses VS Code settings (`collabAgent.supabase.url`, `collabAgent.supabase.anonKey`) or Environment Variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) for credentials.
* **Storage:** Auth tokens are stored in VS Code's **globalState** for persistence across sessions via a custom storage adapter.
* **Session Management:** Sessions persist (`persistSession: true`) and tokens are automatically refreshed (`autoRefreshToken: true`).

**Example:**
```typescript
const supabase = getSupabase();
const { data, error } = await supabase.from('teams').select('*');

if (error) {
  console.error('Failed to fetch teams:', error.message);
} else {
  console.log('Teams data:', data);
}
```

### getCurrentUser Function

Defined in **auth/supabaseClient.ts:129**

Retrieves the currently authenticated user from Supabase using the active session. Returns `null` if no user is signed in.

**Returns:** `Promise<null | User>`
* A Promise that resolves to the authenticated **User** object, or `null` if no user is authenticated.

**Remarks:**
* This function **does not throw** an error on failure; it logs errors to the console.
* Check the return value for `null` to determine the user's authentication status.

**Example:**
```typescript
const user = await getCurrentUser();

if (user) {
  console.log(`Logged in as: ${user.email}`);
  // Use user.id, user.user_metadata, etc.
} else {
  console.log('No user signed in');
}
```







